"use strict";
console.log("test");

const loginform = document.getElementById("login-form");
const loginBtn = document.getElementById("send-btn");

loginBtn.addEventListener("click",async (e) => {
    e.preventDefault();

    const id = document.getElementById("user-id").value;
    const pass = document.getElementById("user-pass").value;

    const res = await fetch("/api/login", {
        method : "POST",
        headers : {"Content-type":"application/json"},
        body : JSON.stringify({ 
            id: id, 
            pass: pass
        }) 
    });

    const data = await res.json();
    if (data.ok) {
        location.href = "/index.html";
    } else {
        if (data.message) {
            alert (data.message);
        } else {
            alert ("ログイン失敗");
        }
    }
    console.log(data);
});

const toRetisterBtn = document.getElementById("register-btn");
toRetisterBtn.addEventListener("click",() => {
    location.href="/register/register.html";
})
