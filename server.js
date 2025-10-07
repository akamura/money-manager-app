"use strict";

require("dotenv").config();//.envを読み込むためのモジュール

const express = require("express");
const path = require("path");//このファイルがある場所を基準に絶対パスを設定するモジュール
const session = require("express-session");//ログイン状態を維持するモジュール
const bcrypt = require("bcryptjs");//パスワードのハッシュ化のためのモジュール
const cors = require("cors");//プラットフォームが異なったりするときに使用する
const mongoose = require("mongoose");//mongoDBに接続すために必要なモジュール

const app = express();

app.use(express.json());//jsonファイルを読めるようにする
app.use(express.urlencoded({ extended: true}));
app.use(cors());

mongoose.connect(process.env.MONGO_URI).then(()=>{//Mongoとの接続
    console.log("MongoDB Atlas connected");
}).catch(err => {
    console.error("Connection error", err);
});

//Mongo用のスキーマの定義------------------------
//ユーザーのデータの定義
const userSchema = new mongoose.Schema({
    id:{ type:String, required: true, unique: true},
    passHash: { type: String, required: true},
    role: { type: String, default: "user"}
});

//出費データの定義
const expenseSchema = new mongoose.Schema({
    userId: { type:String, required: true },
    date: { type:Date, required: true},
    expended: { type:Number, required: true},
    type: { type:String, required: true}
});

//追加項目のデータの定義
const addObjSchema = new mongoose.Schema({
    cate: { type:String, required: true, unique: true},
    price: {type:Number, required: true},
    name: {type:String, required:true, unique: true}
});
//管理者のIDとPassの定義
const adminDataSchema = new mongoose.Schema({
    adminId: { type:String, required:true},
    adminPass: { type:String, required: true}
});

const User = mongoose.model("User", userSchema);
const Expense = mongoose.model("Expense", expenseSchema);
const Addobj = mongoose.model("Addobj", addObjSchema);
const Admin = mongoose.model("Admin", adminDataSchema);

//セッション
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 30
    }
}));

//ログイン用の関数//ログインセッションがない場合にログイン画面へ飛ぶ
function requireLogin (req, res, next) {
    if(req.session && req.session.user) {
        return next();//セッションがある場合はnext（次の関数を処理する）
    }
    if(req.path.startsWith("/api/")) {
        return res.status(401).json({ ok:false, message:"未ログイン"});
    }
    return res.redirect("/login/login.html");//未ログインであれば、ログイン画面へ
}

//管理者権限用のログインガード
function requireAdmin (req,res,next) {
    if(!req.session || !req.session.user) {
        return res.status(401).json({ok:false, message:"ログインが必要です"});
    } else {
        if(req.session.user.role !== "admin") {
            return res.status(403).json({ok:false, message:"管理者権限が費用です"});
        } 
    }
    next();
}

//トップページをログイン画面に固定する（staticよりも前に書くこと）
app.get("/",(_req, res) => {
    res.sendFile(path.join(__dirname, "public","login","login.html"));//ファイルのパス
});

app.use(express.static(path.join(__dirname, "public")));//__dirname・・・server.js（このファイル。記述されたファイル）の位置

//確認用ルート
app.get("/health",(req,res) => {
    res.send("サーバー稼働");
});

app.post("/api/login", async (req,res) => {
    try {

        const {id,pass} = req.body;
        console.log("受信：", id, pass);
        
        if (!id || !pass) {
            return res.status(400).json({ok:false,message:"IDとパスワードが必要です"});
        }

        const user = await User.findOne({id:id});//該当すれば　User　からすべての情報が代入される？
        if(!user) {
            return res.status(400).json({ok:false,message:"IDが存在しません"});
        }

        const ok = await bcrypt.compare(pass, user.passHash);
        if(!ok) {
            return res.status(401).json({ok:false, message:"認証失敗"});
        }
        
        req.session.user = { id: user.id, role: user.role};//ログイン情報（id）をセッションに保存
        
        // console.log("req.session.user",req.session.user);
        return res.status(200).json({ok:true, id: user.id});
    } catch(err) {
        console.error(err);
        return res.status(500).json({ok:false,message:"サーバーエラー"});
    }

});

//ログイン状態のidを専用のルートに渡す
app.get("/api/me",(req,res) => {
    if(req.session && req.session.user) {//req.sessionの存在の確認（ログインしていれば存在する）

        const id_status = req.session.user.id;
        // console.log(id_status)
        // console.log(req.session.user)//sessionを送るのはセキュリティ上危険
        if(id_status) {
            return res.json({ok:true, userId:id_status});    
        } else {
            return res.json({ok:false, id:null});
        }
    } else {
        return res.json({ok:false, id:null});
    }
});

app.post("/api/logout",(req,res) => {
    const {date, id} = req.body;
    req.session.destroy(()=> {
        res.json({ok: true, logoutTime:date, id:id});
    })
});

//情報を保存する "POST"
app.post("/api/expenses",requireLogin, async (req,res)=>{//関数の返り値がtrueなら普通の処理が始まり、falseなら関数内（requireLogin）の処理が始まる
    try {

        const { date, expended, type } = req.body;
        const loginId = req.session.user.id;
        // console.log("受信：",date, expended, type);
        
        const doc = new Expense({//事前に作ったスキーマにそってオブジェクトを作っていく
            userId: loginId,     //idはサーバー側で設定をすること
            date: new Date(date),//日付のデータ型にしておく
            expended: Number(expended),//値を数値のデータ型にしておく
            type: type
        });
        await doc.save();//Mongoに保存
        
        return res.json({//フロントにJsonファイルにして送る
            ok: true,
            id: doc.id,
            date: doc.date,
            expended: doc.expended,
            type: doc.type
        });
    } catch(err) {
        console.error(err);
        res.status(500).json({ok:false, message:"サーバーエラー"});
    }
});

//Mongoから情報を得る
app.get("/api/expenses", requireLogin, async (req,res) => {
    try {
        // const { id } = req.body; getはres.bodyはもたない
        const id = req.session.user.id;

        const list = await Expense.find({userId:id,}).sort({date:1});//idを検索してdataの昇順に並べる

        const items = list.map(d => {
            return {
                userId: d.userId,
                expenseId: d.id,
                date: d.date.toISOString(),
                expended: d.expended,
                type: d.type
            }
        });

        return res.status(200).json({ok:true, item: items});

    } catch(err) {
        console.error(err);
        return res.status(500).json({ok:false,message:"サーバーエラー"});
    }

});

//データベース検索
app.post("/api/data", async (req,res) => {
    try {

        const { startDate, endDate, userName, cateName } = req.body;

        if(!startDate || !endDate) {
            res.json({ok:false, message:"日時の入力は必須です"});
        }
        
        //日付の型を文字からデータ型にする
        const start = new Date(startDate);
        //終了日は最後の時間まで入れる
        const end = new Date(endDate);
        end.setHours(23,59,59,999);

    //Mongoの場合は演算子ではなく $gte $lte で条件を指定する
    const list = await Expense.find({date: { $gte:start, $lte: end}}).find({userId:userName}).sort({date:1});
    
    const items = list.map(item => {
        return {
            userId: item.userId,
            expenseId: item.id,
            date: item.date.toISOString(),
            expended: item.expended,
            type: item.type
        }
    });
    
    return res.status(201).json({ok:true, items:items});

    } catch(e) {
        console.error(e);
        res.status(500).json({ok:false,message:"失敗"});
    }
})

app.get("/api/data", async (req,res) => {

})

//ユーザー登録
app.post("/api/register", async (req,res) => {
    try {

        const {id,pass} = req.body;
        
        if (!id || !pass) {
            return res.status(400).json({ok:false,message:"IDとパスワードが必要です"})
        }
        
        const exsists = await User.findOne({id:id});//
        if(exsists) {
            return res.status(400).json({ok:false, message:"このIDは使用できません"})
        }
        
        //パスワードをハッシュ化して保存
        const passHash = await bcrypt.hash(pass,10);//ハッシュ化
        const user = new User({ id: id, passHash: passHash});//ユーザーオブジェクトの作成
        await user.save();//ユーザー登録（保存）

        res.status(201).json({ok:true,id:id});
    } catch (err) {
        console.error(err);
        res.status(500).json({ok:false,message:"サーバーエラー"});
    }

})

//追加項目のみを一度保存する
app.post("/api/add",requireLogin,async (req,res) => {
    try {
        const { cate, price, name } = req.body;
        const doc = new Addobj({
            cate: cate,
            price: price,
            name: name
        });
        await doc.save();

        return res.json({ok:true,message:"保存しました"});

    } catch(e) {
        console.error(e);
        res.status(500).json({ok:false, message:"保存できませんでした"});
    }
});

//追加項目をMongoから引き出す
app.get("/api/add",requireLogin,async (req,res) => {
    try {
        const obj = await Addobj.find();
        // console.log(obj);

        return res.status(200).json({ok:true, data:obj});
    } catch(e) {
        console.error(e);
        res.status(500).json({ok:false, message:"取得できませんでした"})
    }
})

//管理画面
app.post("/api/admin",requireLogin, requireAdmin, async (req,res) => {
    try {
        // const { id, pass } = req.body;
        // const res = await Admin.find({adminId,adminPass});
        return res.status(200).json({ok:true,message:"通信可能"})
        
    } catch(e) {
        console.error(e);
        res.status(500).json({ok:false,message:"通信できませんでした"})
    }
})

app.get("/api/admin",requireLogin, requireAdmin,async (req,res) => {
    try {
        
    } catch(e) {

    }
});

//出金データの編集
app.post("/api/edit", async (req,res) => {
    try {

        const { items } = req.body;
        console.log(items);
        
        const ops = items.map(row => ({
            
            updateOne: {
                filter: { _id: row.id},
                update: {
                    $set: {
                        type: row.type,
                        expended: Number(row.expended)
                    }
                }
            }
        }));
        
        const result = await Expense.bulkWrite(ops, { ordered: false});

        res.json({
            ok:true,
            message:"受信しました",
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount
        });
    } catch(e) {
        console.error(e);
        res.json({ok:false, message:"エラー"})
    }
});

//項目を削除
app.post("/api/delete", async (req,res) => {
    const items = req.body.items;
    console.log("items: ", items);

    const ids = items.map(item => {
        console.log("items.id: ",item.expenseId);
        return item.expenseId; 
    });

    const result = await Expense.deleteMany({
        _id: { $in: ids}, 
    });

    res.json({ item:items});
})

//追加項目のデータの編集／削除
app.post("/api/add_Edit", async (req,res) => {
    const data = req.body.data;
    console.log("data: ",data);

    const ops = await data.map(row => ({
        updateOne: {
            filter: {_id:row.id},
            update: {
                $set: {
                    cate:row.cate,
                    name:row.name
                }
            }
        }
    }))
    
    const result = await Addobj.bulkWrite(ops, {ordered:false});

    res.json({
            ok:true,
            message:"受信しました",
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount
        });

})

app.post("/api/add_delete", async (req,res) => {
    const data = req.body.data;
    console.log("data_delete",data)

    const adArray = data.map(item => {
        return item.id;
    })

    await Addobj.deleteMany({
        _id: {$in:adArray},
    });

});

app.get("/api/userAdmin",async (req,res) => {
    try {

        const obj = await User.find();

        const userList = [];
        console.log("userList: ",userList)
        
        for(let user of obj) {

            // console.log("user: ",user);
            userList.push({_id: user._id,
                id: user.id,
                // userPassHash: user.passHash,　！！！ハッシュ値は復号できない仕様になっている
                role: user.role
            })
        }
        
        res.json({ok:true, userList:userList});
    } catch(e) {
        console.error(e);
    }

})

app.post("/api/userEdit", async (req,res) => {
    try {

        const data = req.body.data;
        console.log(data);
        
        const ops = data.map(row => ({
            updateOne:{
                filter:{_id:row._id},
                update:{
                    $set: {
                        id:row.id,
                        role:row.role
                    }
                }
                
            }
        }));
        const result = await User.bulkWrite(ops, {order:false});
        
        res.json({
            ok:true,
            message:"保存しました",
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount
        });
    } catch(e) {
        console.error(e);
        res.json({ok:false,message:"エラー"});
    }

})

app.post("/api/userDelet",async(req,res) => {
    const data = req.body.data;
    console.log(data);
    res.json({ok:true,message:"通信完了"});

    await User.deleteMany({
        _id :{$in:data}
    })
})

//ユーザーの確認
app.post("/api/passChange",async(req,res)=>{
    try {

        const { id, pass} = req.body;
        
        const user = await User.findOne({id:id});
        console.log("user: ",user);
        res.json({ok:true,message:"ok"})
    } catch(e) {
        console.error(e);
        res.json({ok:false,message:"bad"})
    }
})

app.post("/api/saveChangePass",async (req,res) => {
    try {

        const {id,pass} = req.body;
        
        const okId = await User.findOne({id:id});
        const passHash = await bcrypt.hash(pass,10);
        console.log("okId: ",okId)
        if(!okId) {
            res.json({ok:false,message:"該当ユーザーが存在しません"});
        }
        await User.updateOne( 
            {id:okId.id},
            {$set: {passHash:passHash}}
        )
        res.json({ok:true,message:"パスワードを変更しました。"});
    } catch(e) {
        console.error(e);
        res.json({ok:false,message:"変更に失敗しました。"})
    }

})

app.listen(8001, () => {
    console.log("ポート8001でサーバー稼働")
})