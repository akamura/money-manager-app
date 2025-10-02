"use strict";

// const { default: mongoose } = require("mongoose");

const now = new Date();
const year= now.getFullYear();
const month = now.getMonth() + 1;
const week = ["日","月","火","水","木","金","土"][now.getDay()];
const day = now.getDate();

let today = `${year}年${month}月${day}日（${week}）曜日`;

document.getElementById("today").textContent = today;

// //ログイン状態の取得
let currentUser = null;

let categolyArray = [
    {cate:"investment" , price:0, name: "投資"},
    {cate:"book" , price:0, name: "本"},
    {cate:"comic" , price:0, name: "漫画"},
    {cate:"waste" , price:0, name: "浪費"},
    {cate:"entertainment" , price:0, name: "娯楽"},
    {cate:"gacha" , price:0, name: "ガチャ"},
    {cate:"food" , price:0, name: "食費"},
    {cate:"food_snack" , price:0, name: "食費（つまみ）"},
    {cate:"out_of_eating" , price:0, name: "外食"},
    {cate:"out_of_eating_drink" , price:0, name: "外食（酒）"},
    {cate:"delivery" , price:0, name: "デリバリー"},
    {cate:"alcohol" , price:0, name: "酒"},
    {cate:"gas" , price:0, name: "ガス"},
    {cate:"electricity_bill" , price:0, name: "電気"},
    {cate:"necessities" , price:0, name: "日用品"},
    {cate:"medi" , price:0, name: "医療費"},
    {cate:"other" , price:0, name: "その他"},
];

function resetCategories () {
    for(let cate of categolyArray) {
        cate.price = 0;
    }
}

let dataArray = [];

window.addEventListener("load", async (e) => {
    
    currentUser = await get_user(); //ログイン状態の確認のため
    
    if(!currentUser.ok) {
        window.location.href = "/login/login.html";
    }
    if(currentUser.userId) {
        document.getElementById("login-status").textContent = `${currentUser.userId}：ログイン中`;
    }

    const res = await fetch("/api/expenses", {
        method: "GET"
    });

    const data = await res.json();

    dataArray = data.item;

    // console.log("dataArray: ",dataArray);

    await tableReflection();

    pastValue();
    
});

//金額と種別の入力
const sendBtn = document.getElementById("send_btn");
sendBtn.addEventListener("click", async (e) => {
    
    dataArray = [];//データの配列を初期化
    e.preventDefault();
    
    //セッションが切れている場合ボタンを押すとログアウトする
    if(!currentUser.ok) {
        window.location.href = "/login/login.html";//サーバーにパスが設定されているから、パスはこれでいい。
    }
    
    const inputTime = new Date().toISOString();
    const nowExpend = document.getElementById("now_expend").value;
    const expendType = document.getElementById("expend_of_type").value; 
    
    const resData = await fetch("/api/expenses", {
        method: "POST",
        headers: {"Content-type":"application/json"},
        body: JSON.stringify({
            date: inputTime,
            // id: currentUser.id,
            expended : Number(nowExpend) || 0,
            type : expendType
        })
    });

    const d = await resData.json();
    // console.log("応答：",d);

    const res = await fetch("/api/expenses", {//モンゴのデータを受け取る
        method: "GET"
    });

    const data = await res.json();
    // console.log("data: ",data);
    // console.log("data.item: ",data.item);

    dataArray = data.item;

    pastValue();

});

//項目を追加ボタン
const addBtn = document.getElementById("add_btn");
addBtn.addEventListener("click", async (e) => {
    const addType = document.getElementById("add_type").value;
    const addId = document.getElementById("add_id").value;

    // categolyArray.push({cate: addId, price:0, name:addType});

    const res = await fetch("/api/add", {//追加した項目のデータを送る
        method:"POST",
        headers: {"Content-type":"application/json"},
        body: JSON.stringify({
            cate: addId, 
            price:0, 
            name:addType
        })
    });
    const data = await res.json();
    // console.log(data);

    await tableReflection();

    pastValue();
});

function pastValue(){

    const PERIOD = { MONTH:0, TODAY:1, WEEK:2}//関数に渡す値を分かりやすくする

    let monthExpense = totalExpence(calc(PERIOD.MONTH));
    let todayExpense = totalExpence(calc(PERIOD.TODAY));
    let weekExpense = totalExpence(calc(PERIOD.WEEK));

    document.getElementById("expended_of_today").textContent = todayExpense;
    document.getElementById("expended_of_week").textContent = weekExpense;
    document.getElementById("expended_of_month").textContent = monthExpense;
    
    document.getElementById("hourly_expended_of_today").textContent = Math.floor((todayExpense / 24) * 100) / 100;
    //週だと日曜時にnow.getDay()が０になってしまい計算がNaNになるのでMath.max()を使い、最低値を１にする
    const dayOfWeekSafe = Math.max(1, now.getDay());
    document.getElementById("hourly_expended_of_week").textContent = Math.floor(((weekExpense / dayOfWeekSafe) / 24) * 100) / 100;
    document.getElementById("hourly_expended_of_month").textContent = Math.floor(((monthExpense / now.getDate()) / 24) * 100) / 100;
    
    //貼り付け
    pricePast(calc(PERIOD.MONTH));
    //グラフ
    pieChart (0);
    
}

//追加項目を引き出す関数
async function addItemArray () {
    const r = await fetch("/api/add", {//追加分を引き出す
        method:"GET"
    });
    const d = await r.json();
    // console.log("d.data",d.data);

    // const add = d.data;

    //d?.data　は d の存在を確認する　あれば　d.data を返す
    //返ってきた値が配列であれば、d.data　そうでなければ　[]を返す。
    const add = Array.isArray(d?.data) ? d.data : [];

    return add;

    // tableReflection();
}

//ログアウトボタン
const logoutBtn = document.getElementById("logout-btn");
logoutBtn.addEventListener("click",async (e) => {

    const logoutTime = new Date().toISOString();
    const res = await fetch("/api/logout",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
            date:logoutTime,
            id:currentUser.userId
        })
    });
    const data = await res.json()
    // console.log(data);

    location.href = "/logout/logout.html";
    
});

//項目を表とプルダウンに反映
async function tableReflection () {

    const tbodyAddItem = document.getElementById("tbody_add_item");
    tbodyAddItem.textContent = "";

    const select = document.getElementById("expend_of_type");
    select.textContent = "";
    
    let addItem = "";
    let addOption = "";

    let add = await addItemArray();

    // console.log("add: ",add);

    //重複項目を取り除く
    let keyObj = new Set(categolyArray.map(item => {//setでkeyの集合体オブジェクトを作る
        return item.cate;
    }));
    // console.log("keyArray: ",keyObj);

    //add自体に重複があった場合に備える-----------------
    let seenInAdd = new Set();//キー名の記録帖
    let addUnique = [];       //オブジェクトそのものを入れる配列

    for(let item of add) {
        if(!seenInAdd.has(item.cate)) {//記録帖に名前がない場合
            seenInAdd.add(item.cate);  //記録帖にキー名を記入
            addUnique.push(item);      //オブジェクトそのものを配列に追加する。
        }
    }
    //------------------------------------------------

    //オブジェクトにないキーがあった時のみ、そのオブジェクトを追加するための配列へと入れ込む
    let addArray = addUnique.filter((item) => {
        // console.log("item: ",item);
        // console.log("item.cate: ",item.cate);
        return !keyObj.has(item.cate)
    })

    // console.log("addArray: ",addArray);

    categolyArray = categolyArray.concat(addArray);

    // console.log("categolyArray: ",categolyArray)

    for(let item of categolyArray) {

        addItem = addItem + 
        `
        <tr>
        <td>${item.name}</td>
        <td id="${item.cate}" class="text-end">0</td>
        </tr>
        `;

        addOption = addOption +
        `<option value="${item.cate}">${item.name}</option>
        `
    }

    tbodyAddItem.insertAdjacentHTML('beforeend', addItem);
    select.insertAdjacentHTML('beforeend', addOption);
}


function calc (period) {//データの整理・処理
    resetCategories();

    //カテゴリー別の出費
    // period = 0;//テスト用
    if (period === "null") {
        period = 0;
    }
    
    for(let data of dataArray) {
        
        let dateInArray = new Date(data.date);

        let date_year = dateInArray.getFullYear();
        let date_now_year = now.getFullYear();

        let date_month = dateInArray.getMonth();
        let date_now_month = now.getMonth();

        let date_today = dateInArray.getDate();
        let date_now_today = now.getDate();

        let comparison = null;//条件式を入れる変数
        //条件を変数に代入
        if (period === 0) {//条件が今年の今月
            comparison = ((date_year === date_now_year) && (date_month === date_now_month))
        } else if (period === 1) {//条件が今日
            comparison = ((date_year === date_now_year) && (date_month === date_now_month) &&
             (date_today === date_now_today))
        } else if (period === 2) {//条件が今週
            comparison = isThisWeek(dateInArray)
        }

        if(comparison) {
            
            for(let cate of categolyArray){
                if (data.type === cate.cate && data.userId === currentUser.userId) {
                    
                    cate.price = cate.price + Number(data.expended);
                }
            }
        }

    }

    return categolyArray;
}

function totalExpence (array) {
    let expence = 0;

    for(let obj of array ) {
        for(let key in obj) {
            if(!isFinite(obj[key])) {
                continue;
            }
            expence = expence + Number(obj[key]);
        }
    }

    return expence;
}

function pricePast (array) {//カテゴリー別に貼り付け

    for(let obj of array) {
        // console.log("obj.cate: ",obj.cate);
        document.getElementById(`${obj.cate}`).textContent = obj.price;
    }
}

function isThisWeek (date) {//今週の判定
    const nowDate = new Date();

    const startWeek = new Date (
        nowDate.getFullYear(),//年の設定
        nowDate.getMonth(), //月の設定
        nowDate.getDate() - nowDate.getDay(),//日付の調整
        0,0,0,0//時刻の設定
    )

    const endWeek = new Date (
        startWeek.getFullYear(),
        startWeek.getMonth(),
        startWeek.getDate() + 7,
        0,0,0,0
    )

    if (startWeek <= date && date < endWeek){
        return true;
    } else {
        return false;
    }
}

//円グラフの描画
function pieChart (n) {
    const dataObjArray = calc(n);
    const fillteredData = dataObjArray.filter((obj) => {
        return obj.price > 0;
    });
    const sortedDate = fillteredData.sort((a,b) => {
        return b.price - a.price;
    });

    const compact = compressSmallSlices(sortedDate, 0.02);
    const labels = compact.map(o => o.name);
    const data = compact.map(o => o.price);

    const colorMap = ["#4E79A7","#F28E2B","#E15759","#76B7B2","#59A14F",
                    "#EDC948","#B07AA1","#FF9DA7","#9C755F","#BAB0AC",        "#4E79A7", // ブルー
                    "#F28E2B", // オレンジ
                    "#E15759", // レッド
                    "#76B7B2", // ティール
                    "#59A14F", // グリーン
                    "#EDC948", // イエロー
                    "#B07AA1", // パープル
                    "#FF9DA7", // ピンク
                    "#9C755F", // ブラウン
                    "#BAB0AC", // グレー
                    "#86BCB6", // ライトティール
                    "#FABFD2", // ライトピンク
                    "#A6CEE3", // 水色
                    "#1F78B4", // 濃いブルー
                    "#33A02C", // 濃いグリーン
                    "#FB9A99", // サーモンピンク
                    "#E31A1C", // ダークレッド
                    "#FDBF6F", // 明るいオレンジ
                    "#CAB2D6", // ラベンダー
                    "#6A3D9A"  // 濃いパープル
    ];

    let colorArray = [];
    const len = fillteredData.length;
    for(let i = 0;i<len;i++) {
        colorArray.push(colorMap[i % colorMap.length]);
    }

    const canvas = document.getElementById("pieChart");
    const ctx = canvas.getContext("2d");

    if (window.myPieChart) {
        window.myPieChart.destroy();
    }

    const isNarrow = window.matchMedia("(max-width: 950px)").matches;

    window.myPieChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data: data,
                backgroundColor: colorArray,
                borderColor: "#fff",
                bordeWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 8},
            plugins: {
                legend: {
                    position: isNarrow ? "bottom" : "right",
                    align: "center",
                    labels: {
                        usePointStyle: true,
                        pointStyle: "circle",
                        boxWidth: 30,
                        boxHeight: 30,
                        padding: 14
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${Number(ctx.raw).toLocaleString()}円`
                    }
                }
            }
        }
    });

}

function compressSmallSlices (array, thresholdRatio = 0.02) {
    const total = array.reduce((sum,o) => sum + o.price, 0) || 1;
    const big = [];
    let smallsum = 0;

    for (const o of array){
        if((o.price / total) < thresholdRatio) smallsum += o.price;
        else big.push(o);
    } 
    if (smallsum > 0) big.push({cate:"other",name:"その他", price: smallsum});
    return big;
}

//棒グラフ
function barGraph () {
    

}

//一日ごとの出金額を出す 今日までの7日分
(async function byDateExpended (array) {
    const res = await fetch("/api/expenses", {
        method:"GET"
    });
    const data = await res.json();

    array = data.item;

    const now = new Date();
    // now.setDate(now.getDate() - 7);

    console.log("now",now);
    console.log("now.getDate() -7: ",now);
    console.log("array: ", array);
    // for(let i = now.getDate();i < 7; i--){
    //     now.setDate(now.getDate() - i);
    //     console.log(now);
    // }
})();


//管理画面ボタン
const adminBtn = document.getElementById("adminBtn");
adminBtn.addEventListener("click", async (e) => {
    const adminId = document.getElementById("adminId").value;
    const adminPass = document.getElementById("adminPass").value;

    const res = await fetch("/api/admin", {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            id:adminId,
            pass:adminPass
        })
    });

    const data = await res.json();

    if(data.ok) {
        location.href = "/admin/admin.html"
    }
    if(!data.ok) {
        const msg = (data && data.message) ? data.message : `${res.status} ${res.statusText}`;
        alert(msg);
    }

    // const r = await fetch("/api/admin", {
    //     method:"GET"
    // });
})

//ログインしているユーザーのIDを取得
async function get_user () {

    const res = await fetch("/api/me");
    const data = await res.json()

    return { userId:data.userId, ok:data.ok};

}
