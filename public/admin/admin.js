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


    addItemFn();//追加項目の表示
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

    // console.log("cateName",cateName)

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
    console.log("応答：",postData);

    let convertArray = categolyArray;
    let convertName = cateName;

    serachedArray = postData.items;//検索結果のデータ
    // console.log("serachedArray: ",serachedArray)

    if(cateName !== "all"){
        //名前が一致する項目だけを配列に追加
        serachedArray = postData.items.filter(item => {
            if(convertName === item.type) {
                return item;
            }
        });
    } else if(cateName === "all") {
        // console.log("all");
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
    // console.log(tbodyTable);
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
        // console.log("test");
        // console.log("editMode: ",editMode);
    } else {
        await edit();
        await pastTable();
        editMode = false;
        btnEdit.textContent = "編集";
        // console.log("test2");
        // console.log("editMode2: ",editMode);
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
            // console.log(head);
            head.textContent = "";
            // console.log("item.date: ",Date(item.date));
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
            // console.log("optionsHtml: ",optionsHtml);
            
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

            // console.log("id",item.expenseId);

        }        
    }
    // return array;
}

//一つでもチェックが入っているかを判定する
function boxCheckedStatus () {
    let array = [];
    for(let item of serachedArray) {
        let check = document.getElementById(`${item.expenseId}-box`);
        // console.log("check: ",check);
        if (check.checked) {
            array.push(true) 
        } else if (!check.checked) {
            array.push(false)
        };
    }
    // console.log("array: ",array);
    return array.find((isbloom) => isbloom == true);
    
}

//編集機能
async function edit () {
    let array = [];
    for(let item of serachedArray) {

        let boxStatus = document.getElementById(`${item.expenseId}-box`);
        // if(boxStatus.checked) {                      //入力された最新の値を送っていない状態
        //     array.push({id: item.expenseId,
        //             user: item.userId,
        //             type: item.type,
        //             expended: item.expended
        //     });
            // document.getElementById(`${item.expenseId}-box`).checked = false;
            if(!boxStatus || !boxStatus.checked) {
                continue;
            }

            // let date = document.getElementById(`${item.expenseId}-date`);
            let type = document.getElementById(`${item.expenseId}-type`).value;
            let expended = document.getElementById(`${item.expenseId}-expended`).value;

            // if(!type || !expended ) {
            //     continue;
            // }

            array.push({id: item.expenseId,
                        // date: date,
                        type: type,
                        expended: expended
            });
        // }
    }
    // console.log("array: ",array);
    const res = await fetch("/api/edit", {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            ok: true,
            items: array
        })
    })
    
    const data = await res.json();
    // console.log("data: ",data);
    // console.log("editModeInEditFn:",editMode);

    // btnEdit.addEventListener("click", (e) => {
    //     e.preventDefault();
    //     if (editMode == true) {
    //         console.log("editMode:",editMode);
    //         editMode == false;
    //         pastTable();
    //     }
    // })
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
    console.log("array: ",array);

    const res = await fetch("/api/delete", {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            items: array
        })
    });

    const data = await res.json();
    console.log("data: ",data);
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

    // console.log(addItem);

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

    // console.log("addItem: ",addItem)
    // console.log("addItemHtml: ",addItemHtml)
}


//追加項目の編集ボタン
const addBtnEdit = document.getElementById("addBtnEdit");
addBtnEdit.addEventListener("click", async (e) => {
    e.preventDefault();

    //ボタンを押したか判定　　　未完成 array0の扱いが問題になってる
    // let boxStatusArray = [];
    // for(let item of array_0) {
    //     let box = document.getElementById(`add-${item._id}-box`).checked;
    //     console.log("box: ",box)
    //     boxStatusArray.push(box);
    // }
    // console.log("boxStatusArray: ",boxStatusArray)
    // let judge = boxStatusArray.find(item => {
    //     console.log("iteminarray:",item)
    //     if(item == true) {
    //         return true;
    //     } else {
    //         return false;
    //     }
    // })

    let judge = addItemCheckBox();
    console.log("judge: ",judge);

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
        console.log("box: ",box)
        boxStatusArray.push(box);
    }
    console.log("boxStatusArray: ",boxStatusArray)
    let judge = boxStatusArray.find(item => {
        console.log("iteminarray:",item)
        if(item == true) {
            return true;
        } else {
            return false;
        }
    })
    console.log("judge: ",judge);

    return judge;
}


//編集画面に切り替える
async function editaddItem () {
    
    array_0 = addItem.data;
    console.log("前の方　array_0: ",array_0)
    // console.log("addItem2: ",addItem);
    
    for(let item of array_0) {
        
        let box = document.getElementById(`add-${item._id}-box`).checked;
        let head = document.getElementById(`row-${item._id}`);
        let addInsertHtml = "";
        
        // console.log("head: ",head);
        // head.textContent = "";

        //チェックが入っていたら編集画面にする
        if(!box) {
            continue;
        } else {
            // array_0 = array_0.filter(item_0 => {
            //     if(item_0 !== item) {
            //         console.log("item: ",item)
            //         return item;
            //     } else if (item_0 == item) {
            //         array_1.push(item);
            //     }
            // })
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
        console.log("後ろの方　array_0: ",array_0)
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
    console.log(data);
}

//削除ボタン
const addBtnDelete = document.getElementById("addBtnDelete");
addBtnDelete.addEventListener("click", async (e) => {
    e.preventDefault();
    let judge = addItemCheckBox();
    
    if (!judge) {
        console.log("削除");
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
    console.log("checkBoxArray: ",checkBoxArray);

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

