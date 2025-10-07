"use strict";

const btnIndex = document.getElementById("index-btn");
btnIndex.addEventListener("click", (e) =>{
    e.preventDefault();

    location.href="/index.html";
});

const btnLogout = document.getElementById("logout-btn");
btnLogout.addEventListener("click",(e) => {
    e.preventDefault();

    location.href="/logout/logout.html";   
})

const btnSend = document.getElementById("btnSend");
btnSend.addEventListener("click",async (e)=>{
    e.preventDefault();

    const oldId = document.getElementById("user-id").value;
    const oldPass = document.getElementById("user-pass").value;
    if(!oldId || !oldPass ) {
        alert("idとパスワードを入力してください");
        return;
    }
    
    let target = document.getElementById("changeForm");
    if(await comformUser()) {
        let insertHtml = 
        `
        <div>
            <label for="changeId" class="form-label">新しいパスワード</label>
            <input id="changeId" type="text" class="form-control">
        </div>
        <div>
            <label for="comformPass" class="form-label">確認入力</label>
            <input id="comformPass" type="password" class="form-control">
        </div>
        <button id="btnChange">変更</button>
        `

        target.textContent = "";
        console.log("target",target);
        target.insertAdjacentHTML("beforeend",insertHtml);

    } else {
        alert("ログインしてください");
        target.textContent = "";
        return;
    }

    const btnChange = document.getElementById("btnChange");
    btnChange.addEventListener("click",async (e1) => {
        e1.preventDefault();
        
        conform();
        let newPass = document.getElementById("changeId").value;
        saveChangePass(oldId,newPass);

    })

})
//パスワードの一致の確認
function conform () {
    const newPass = document.getElementById("changeId");
    const conformPass = document.getElementById("comformPass");

    let ok = null;
    if((newPass && newPass.value) || (conformPass && conformPass.value)) {
        if(newPass.value !== "" || conformPass !== ""){

            if(newPass.value === conformPass.value) {
                return ok = true;
            }        
        }
    }
    if(!ok) {
        alert("パスワードが一致していません")
        return false;
    }
    return true;
}
//変更したパスワードの保存関数
async function saveChangePass (id,pass) {

    const res = await fetch("/api/saveChangePass", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
            id:id,
            pass:pass
        })
    });
    const data = await res.json();

    console.log(data);

}


//ユーザーの確認
async function comformUser () {
    const oldId = document.getElementById("user-id").value;
    const oldPass = document.getElementById("user-pass").value;

    const res = await fetch("/api/login", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            id:oldId,
            pass:oldPass
        })
    })

    const data = await res.json();
    console.log(data);

    return data.ok;
}
