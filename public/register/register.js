"use strict";

const registerBtn = document.getElementById("register-btn");
registerBtn.addEventListener("click", async (e) =>{

    const id = document.getElementById("register-input-id").value;
    const pass = document.getElementById("register-input-pass").value;

    console.log(id,pass);

    const res = await fetch("/api/register", {
        method:"POST",
        headers:{
            "Content-type":"application/json"
        },
        body: JSON.stringify({id:id,pass:pass}) 
    });

    const data = await res.json();
    console.log(data);
    if(data.ok) {
        location.href="/login/login.html";
    } else {
        alert("ほかのIDを使用してください")
    }
})

const toLoginBtn = document.getElementById("to-login-btn");
toLoginBtn.addEventListener("click", async () => {
    location.href="/login/login.html";
})