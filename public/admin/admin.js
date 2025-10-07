"use strict";

const now = new Date();
let nowYear = now.getFullYear();
let nowMonth = now.getMonth() + 1;
let nowDate = now.getDate();
let nowWeekDay = ["日","月","火","水","木","金","土"][now.getDay()];

function fmt (mode) {
    if(mode == 0) {
        return `${nowYear}-${String(nowMonth).padStart(2,"0")}-${String(nowDate).padStart(2,"0")}`
    } else if (mode == 1) {
        return `${nowYear}-${String(nowMonth).padStart(2,"0")}-${String(1).padStart(2,"0")}`
    }
}

document.getElementById("start_date").value = fmt(1);
document.getElementById("end_date").value = fmt(0);

let categolyArray = [
    {cate:"all" , price:0, name: "すべて"},
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

const tbody = document.getElementById("tbody");
tbody.textContent = "";
let tbody_check = tbody;
let checkboxArray = [];
let serachedArray = [];

let editCounter = 0;
let checkboxStatus = null;
let editMode = false;
let addEditMode = false;
let addItem;

//追加項目時の変数
let preAddArray = [];
let ploAddArray = [];
let array_0 = [];//追加項目のデータの初期状態
let array_1 = [];//fetchで送ってDBの編集に使う。


//コード⇔日本語　変換
const cateCodeToName = {};
const cateNameToCode = {};
for (let c of categolyArray) {
    cateCodeToName[c.cate] = c.name;
    cateNameToCode[c.name] = c.cate;
}

let currentUser = null;

//ページの読み込み直後の動作
window.addEventListener("load", async (e) => {
    
    //アカウントのセッションの確認
    const res = await fetch("/api/me", {
        method:"GET"
    });

    const sessionStatus = await res.json();
    if(!sessionStatus.ok) {
        location.href="/login/login.html";
    }

    //追加項目の呼び出し
    const add = await fetch("/api/add", {
        method: "GET"
    })
    addItem = await add.json();

    let keyObj = new Set(categolyArray.map(item => {
        return item.cate;
    }));

    let addOption = "";
    let seenName = new Set();
    let addUnique = [];
    
    for(let obj of addItem.data) {
        if(!seenName.has(obj.cate)) {
            seenName.add(obj.cate);
            addUnique.push(obj);
        }
    }
    
    let addArray = addUnique.filter((item) => {
        return !keyObj.has(item.cate);
    })
    
    categolyArray = categolyArray.concat(addArray);

    for(let name of categolyArray) {
        
        addOption = addOption + 
        `
        <option value="${name.cate}">${name.name}</option>
        `
    }
    // console.log("categolyArray: ",categolyArray)
    // console.log("addOption: ",addOption)
    document.getElementById("cate_name").textContent = "";
    document.getElementById("cate_name").insertAdjacentHTML("beforeend",addOption);

    array_0 = addItem.data;
    // array_1 = addItem.data;
    
    currentUser = get_user();
    if(!currentUser) {
        location.href = "/login/login.html";
    } else {
        document.getElementById("login-status").textContent = `${(await currentUser).userId}がログイン中`
    }


    addItemFn();//追加項目の表示]
    await userInfomation();

});

//通常画面に戻るボタン
document.getElementById("index-btn").addEventListener("click",(e) => {
    e.preventDefault();
    location.href = "/index.html";
})

//検索ボタン
const btnSearch = document.getElementById("btnSearch");
btnSearch.addEventListener("click", async (e) => {
    
    e.preventDefault();
    
    await pastTable();
    
});

async function pastTable () {

    const startDate = document.getElementById("start_date").value;
    const endDate = document.getElementById("end_date").value;
    const userName = document.getElementById("user_name").value;
    const cateName = document.getElementById("cate_name").value;


    if(startDate === "" || endDate === "") {
        alert("必須項目は入力してください");//入力されていない場合は全期間にする
    }

    const postRes = await fetch("/api/data", {
        method:"POST",
        headers: {"Content-type":"application/json"},
        body: JSON.stringify({
            startDate: startDate,
            endDate: endDate,
            userName: userName,
            cateName: cateName
        })
    });

    const postData = await postRes.json();//引き出したデータ

    let convertArray = categolyArray;
    let convertName = cateName;

    serachedArray = postData.items;//検索結果のデータ

    if(cateName !== "all"){
        //名前が一致する項目だけを配列に追加
        serachedArray = postData.items.filter(item => {
            if(convertName === item.type) {
                return item;
            }
        });
    } else if(cateName === "all") {
    }
    //idの文字列を名前に変換
    for(let obj of convertArray) {
        if(cateName === obj.name) {
            convertName = obj.cate;
        }
    }

    //idを日本語に変換//serchearrayの値を変えてしまうので廃止！！！
    // for(let item of serachedArray) {
    //     for(let obj of categolyArray) {
    //         if( item.type === obj.cate){
    //             item.type = obj.name;
    //         }
    //     }
    // }

    //テーブルに検索結果を表示する
    document.getElementById("tbody").textContent = "";
    let tbodyTable = "";
    
    for(let item of serachedArray) {
        let date = new Date(item.date);
        let typeName = cateCodeToName[item.type] || item.type;
        tbodyTable = tbodyTable + 
        `
        <tr id="${item.expenseId}-head" data-type-code="${item.type}">
            <td id="${item.expenseId}-date">${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2,"0")}/${String(date.getDate()).padStart(2,"0")} ${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}</td>
            <td id="${item.expenseId}-user">${item.userId}</td>
            <td id="${item.expenseId}-type">${typeName}</td>
            <td id="${item.expenseId}-expended" class="text-end">${item.expended}円</td>
            <td id="${item.expenseId}-remark">備考</td>
            <td id="${item.expenseId}-status">状態</td>
            <td><input id="${item.expenseId}-box" type="checkbox"></td>
        </tr>
        `
        //idを埋め込む場合は一意性の強いものを使用すること　${item.expenseId}-box　//
    }
    document.getElementById("tbody").insertAdjacentHTML('beforeend', tbodyTable);
}

//編集ボタン
const btnEdit = document.getElementById("btnEdit");
btnEdit.addEventListener("click",async (e) => {
    e.preventDefault();

    if(!boxCheckedStatus()){
        alert("チェックボックスエラー");
        return;
    }

    if(editMode == false) {
        checkbox();
        editMode = true;
        btnEdit.textContent = "保存";
    } else {
        await edit();
        await pastTable();
        editMode = false;
        btnEdit.textContent = "編集";
    }

});

//チェックボックスにチェックが入っている所を入力画面にする
function checkbox  () {
    
    if(tbody_check == "") {
        return [];
    }
    let array = [];
    for (let item of serachedArray) {
        let check = document.getElementById(`${item.expenseId}-box`);
        if(!check) {
            return;
        } else if (check && check.checked) {
            array.push({date: item.date,
                        user: item.userId,
                        expenseId:item.expenseId,
                        type:item.type,
                        expence: item.expended
            });
            let head = document.getElementById(`${item.expenseId}-head`);
            head.textContent = "";
            let date = `${new Date(item.date).getFullYear()}-${String(new Date(item.date).getMonth() + 1).padStart(2,"0")}-${String(new Date(item.date).getDate()).padStart(2,"0")}`
            let selected = null;
            let optionsHtml = "";
            for(let c of categolyArray) {
                if(c.cate === item.type) {
                    selected = "selected"
                } else {
                    selected = "";
                }
                optionsHtml += `<option value="${c.cate}" ${selected}>${c.name}</option>`;
            }
            
            // <td><input id="{item.expenseId}-type"     type="text"   value="{item.type}"   class="form-control"></td>
            
            let insertHead =  
            `
            
            <td><input id="${item.expenseId}-date"     type="date"   value="${date}"   class="form-control"></td>
            <td><input id="${item.expenseId}-user"     type="text"   value="${item.userId}" class="form-control"></td>
            <td>
                <select id="${item.expenseId}-type" value="${item.type}" class="form-control">
                ${optionsHtml}
                </select>
            </td>
            <td><input id="${item.expenseId}-expended" type="Number" value="${item.expended}" class="form-control"></td>
            <td><input id="${item.expenseId}-remak"    type="text"   value="true" class="form-control"></td>
            <td><input id="${item.expenseId}-status"   type="text"   value="true" class="form-control"></td>
            <td><input id="${item.expenseId}-box"      type="checkbox" checked></td>
            
            `
            // checkboxにcheckedプロパティが存在しているとtrueになることに注意
            head.insertAdjacentHTML("beforeend",insertHead);


        }        
    }
    // return array;
}

//一つでもチェックが入っているかを判定する
function boxCheckedStatus () {
    let array = [];
    for(let item of serachedArray) {
        let check = document.getElementById(`${item.expenseId}-box`);
        if (check.checked) {
            array.push(true) 
        } else if (!check.checked) {
            array.push(false)
        };
    }
    return array.find((isbloom) => isbloom == true);
    
}

//編集機能
async function edit () {
    let array = [];
    for(let item of serachedArray) {

        let boxStatus = document.getElementById(`${item.expenseId}-box`);
            if(!boxStatus || !boxStatus.checked) {
                continue;
            }

            // let date = document.getElementById(`${item.expenseId}-date`);
            let type = document.getElementById(`${item.expenseId}-type`).value;
            let expended = document.getElementById(`${item.expenseId}-expended`).value;

            array.push({id: item.expenseId,
                        // date: date,
                        type: type,
                        expended: expended
            });
        // }
    }
    const res = await fetch("/api/edit", {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            ok: true,
            items: array
        })
    })
    
    const data = await res.json();
    return array;
}

//削除機能
const btnDelete = document.getElementById("btnDelete");
btnDelete.addEventListener("click" , async (e) => {
    e.preventDefault();

    if(!boxCheckedStatus()){
        alert("チェックボックスエラー");
        return;
    }
    let array = [];
    for (let item of serachedArray) {
        let key = document.getElementById(`${item.expenseId}-box`).checked;
        if(!key) {
            continue;
        }
        array.push(item);

    }

    const res = await fetch("/api/delete", {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            items: array
        })
    });

    const data = await res.json();
    pastTable();
})

//追加項目の管理
//追加項目の初期状態を表示する
async function addItemFn () {
    const addTbody = document.getElementById("tbody-addItem");
    addTbody.textContent = "";

    let addItemHtml = "";

    let add = await fetch("/api/add", {
        method: "GET"
    });

    addItem = await add.json();
    array_0 = addItem.data;


    for (let item of addItem.data) {
        
        addItemHtml += 
        `
        <tr id="row-${item._id}" data-id="${item._id}">
            <td id="add-${item._id}-name"     type="text"   value="${item.name}" class="text-align">${item.name}</td>
            <td id="add-${item._id}-cate"     type="text"   value="${item.cate}" >${item.cate}</td>
            <td class="text-center">
                <div class="form-check m-0 d-inline-block">
                    <input id="add-${item._id}-box" class="form-check-input" type="checkbox">
                </div>
            </td>
        </tr>
        `
    }

    addTbody.insertAdjacentHTML("beforeend",addItemHtml);

}


//追加項目の編集ボタン
const addBtnEdit = document.getElementById("addBtnEdit");
addBtnEdit.addEventListener("click", async (e) => {
    e.preventDefault();

    let judge = addItemCheckBox();

    if(!judge) {
        alert("チェックボックスエラー");
        return;
    }

    if(addEditMode == false) {
        await editaddItem();
        addBtnEdit.textContent = "保存";
        addEditMode = true;
    } else if (addEditMode == true) {
        await addEditSave();
        await addItemFn();
        addBtnEdit.textContent = "編集";
        addEditMode = false;
    }
})

//追加項目のチェックボックス検出
function addItemCheckBox () {
    let boxStatusArray = [];
    for(let item of array_0) {
        let box = document.getElementById(`add-${item._id}-box`).checked;
        boxStatusArray.push(box);
    }
    let judge = boxStatusArray.find(item => {
        if(item == true) {
            return true;
        } else {
            return false;
        }
    })

    return judge;
}

//編集画面に切り替える
async function editaddItem () {
    
    array_0 = addItem.data;
    // console.log("addItem2: ",addItem);
    
    for(let item of array_0) {
        
        let box = document.getElementById(`add-${item._id}-box`).checked;
        let head = document.getElementById(`row-${item._id}`);
        let addInsertHtml = "";
        
        //チェックが入っていたら編集画面にする
        if(!box) {
            continue;
        } else {
            head.textContent = "";
            addInsertHtml = 
            `        
            <tr id="row-${item._id}" data-id="${item._id}">
                <td> <input id="add-${item._id}-name"     type="text"   value="${item.name}" class="text-align form-control"></td>
                <td> <input id="add-${item._id}-cate"     type="text"   value="${item.cate}" class="form-control"></td>
                <td class="text-center">
                <div class="form-check m-0 d-inline-block">
                    <input id="add-${item._id}-box" class="form-check-input" type="checkbox" checked>
                </div>
                </td>
            </tr>
            `
        }
        // console.log("addInsertHtml: ",addInsertHtml)
        head.insertAdjacentHTML("beforeend",addInsertHtml);
    }
}

async function addEditSave () {
    
    for (let item of array_0) {

        let box = document.getElementById(`add-${item._id}-box`).checked;
        
        if(!box) {
            continue;            
        } else if (box) {
            const cate = document.getElementById(`add-${item._id}-cate`).value;
            const name = document.getElementById(`add-${item._id}-name`).value;
            array_1.push({
                id: item._id,
                cate: cate,
                price: item.price,
                name: name
            });
        }
        
    }

    const res = await fetch("/api/add_Edit", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            data: array_1
        })
    })
    const data = res.json();
    // console.log(data);
}

//削除ボタン
const addBtnDelete = document.getElementById("addBtnDelete");
addBtnDelete.addEventListener("click", async (e) => {
    e.preventDefault();
    let judge = addItemCheckBox();
    
    if (!judge) {
        // console.log("削除");
        alert("チェックボックスエラー");
        return;
    }

    addItemDelete();
    addItemFn();
});

//選択した項目を削除
async function addItemDelete () {

    let checkBoxArray = [];
    for(let item of array_0 ) {
        const box = document.getElementById(`add-${item._id}-box`).checked;
        if(box) {
            checkBoxArray.push({id: item._id});
        }
    }
    // console.log("checkBoxArray: ",checkBoxArray);

    const res = await fetch("/api/add_delete", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            data:checkBoxArray
        })
    });

} 
 
//ログインしているユーザーのIDを取得
async function get_user () {

    const res = await fetch("/api/me");
    const data = await res.json()

    return { userId:data.userId, ok:data.ok};

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

let mode = 0;
const userBtnEdit = document.getElementById("userBtnEdit");
userBtnEdit.addEventListener("click",async (e) => {
    e.preventDefault();

    let judge = await checkBoxMember();
    if(!judge) {
        alert("チェックボックスエラー");
        return;
    }
    if(mode == 0) {

        await changeAdmin();
        mode = 1;
        userBtnEdit.textContent = "保存";
    } else if (mode == 1) {
        await sendData();
        await userInfomation();
        mode = 0;
        userBtnEdit.textContent = "編集";
    }

});

//削除ボタン
const userBtnDelete = document.getElementById("userBtnDelete");
userBtnDelete.addEventListener("click",async (e) =>{
    e.preventDefault();

    let judge = await checkBoxMember();
    if(!judge) {
        alert("ボックスエラー")
        return;
    }

    await deleteUser();
    await userInfomation();

})

//削除機能
async function deleteUser () {
    let array = [];
    let list = await userList();
    for(let user of list) {
        let box = document.getElementById(`add-${user._id}-box`);
        if(box && box.checked) {
            array.push(user._id);
        }
    }
    console.log("userArray",array);
    const res = await fetch("/api/userDelet",{
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body:JSON.stringify({
            data:array
        })
    })

    const data = res.json();
    console.log(data);
}

//ユーザー情報を引き出す
async function userInfomation () {
    try {

        let list = await userList();
        console.log("list: ",list);
        document.getElementById("tbody-userInfo").textContent = "";
        let insertUserinfo = "";
        for(let user of list) {
            insertUserinfo +=
        `
        <tr id="row-${user._id}" data-id="${user._id}">
            <td id="add-${user._id}-name"     type="text"   value="${user.id}" class="text-align">${user.id}</td>
            <td id="add-${user._id}-cate"     type="text"   value="${user.role}" >${user.role}</td>
            <td class="text-center">
                <div class="form-check m-0 d-inline-block">
                    <input id="add-${user._id}-box" class="form-check-input" type="checkbox">
                </div>
            </td>
        </tr>
        `
        }
        const userBody = document.getElementById("tbody-userInfo");
        userBody.insertAdjacentHTML("beforeend",insertUserinfo);

    } catch (e) {
        console.error(e);

    }
}

//権限の変更画面
async function changeAdmin () {
    let ubody = document.getElementById("tbody-userInfo");
    let insertHtml = "";
    let list = await userList();
    
    for(let user of list) {
        let box = document.getElementById(`add-${user._id}-box`).checked;
        let head = document.getElementById(`row-${user._id}`)
        
        if(!box) {
            continue;
        } else {
            head.textContent = "";
            
            insertHtml =  
            `
            <tr id="row-${user._id}" data-id="${user._id}">
                <td> <input id="add-${user._id}-name"     type="text"   value="${user.id}" class="text-align form-control"></td>
                <td> <input id="add-${user._id}-cate"     type="text"   value="${user.role}" class="form-control" ></td>
                <td class="text-center">
                    <div class="form-check m-0 d-inline-block">
                        <input id="add-${user._id}-box" class="form-check-input" type="checkbox" checked>
                    </div>
                </td>
            </tr>
            `
        }
        // ubody.textContent = "";
        head.insertAdjacentHTML("beforeend",insertHtml);
    }
}
//変更したユーザーの情報を送る
async function sendData () {
    let list = await userList();
    let dataArray = [];
    
    for(let user of list) {
        let box = document.getElementById(`add-${user._id}-box`);
        // console.log("box:",box)
        
        let id = user.id;
        let role = user.role;

        if (!box.checked) {
            continue;
        } 

        let idEle = document.getElementById(`add-${user._id}-name`);
        let roleEle = document.getElementById(`add-${user._id}-cate`);

        if (box && idEle && roleEle) {
            id = idEle.value;
            role = roleEle.value;
        }
        // console.log("id: ",id)
        // console.log("role: ",role)
        dataArray.push({_id:user._id,id:id,role:role});
    }

    const res = await fetch("/api/userEdit/",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
            data:dataArray
        })
    })
    let data = res.json();
    console.log("data742: ",data);
}

//チェックボックス
async function checkBoxMember () {
    let boxStatus = [];
    let list = await userList();

    for (let user of list) {
        if(document.getElementById(`add-${user._id}-box`).checked) {
            boxStatus.push(true);
        } else {
            boxStatus.push(false);
        }
        
    }
    let judge = null;
    if(boxStatus.length >= 1) {
        judge = boxStatus.find(item => {
            if (item == true) {
                return true;
            } else {
                return false;
            }
        })
    }
    return judge;
}

async function userList () {
    const res = await fetch("/api/userAdmin",{
        method:"GET"
    });

    const data = await res.json();
    const list = data.userList;

    return list;
}