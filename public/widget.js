(function () {
  "use strict";
  var script = document.currentScript;
  if (!script) return;
  var id = script.getAttribute("data-business");
  if (!/^[a-f0-9-]{36}$/i.test(id || "")) return;
  var locale = script.getAttribute("data-locale") || "ru";
  if (["ru", "uk", "en"].indexOf(locale) < 0) locale = "ru";
  var origin = new URL(script.src).origin,
    host = document.createElement("div");
  host.setAttribute("data-replylocal-widget", "");
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" }),
    style = document.createElement("style");
  style.textContent =
    ":host{all:initial}button{position:fixed;bottom:20px;right:20px;background:#18181b;color:white;border:0;border-radius:28px;padding:15px 22px;font:600 15px Arial;cursor:pointer;box-shadow:0 5px 25px #0003;z-index:2147483001}iframe{position:fixed;right:20px;bottom:82px;width:380px;height:620px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 104px);border:1px solid #ddd;border-radius:20px;background:white;box-shadow:0 12px 50px #0003;z-index:2147483000}iframe[hidden]{display:none}@media(max-width:480px){iframe{right:12px;bottom:82px;width:calc(100vw - 24px)}button{right:12px}}";
  root.appendChild(style);
  var button = document.createElement("button");
  button.type = "button";
  var label =
    locale === "en"
      ? "Chat with us"
      : locale === "uk"
        ? "Напишіть нам"
        : "Напишите нам";
  button.textContent = label;
  button.setAttribute("aria-expanded", "false");
  root.appendChild(button);
  var frame;
  button.onclick = function () {
    if (!frame) {
      frame = document.createElement("iframe");
      var chatUrl = new URL(origin + "/" + locale + "/chat/" + id);
      var pageUrl = new URL(window.location.href);
      ["utm_source", "utm_medium", "utm_campaign"].forEach(function (key) {
        var value = pageUrl.searchParams.get(key);
        if (value) chatUrl.searchParams.set(key, value.slice(0, 120));
      });
      chatUrl.searchParams.set("referrer", (pageUrl.origin + pageUrl.pathname).slice(0, 500));
      frame.src = chatUrl.toString();
      frame.title = "ReplyLocal — " + label;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      root.appendChild(frame);
    } else frame.hidden = !frame.hidden;
    button.setAttribute("aria-expanded", String(!frame.hidden));
    button.textContent = frame.hidden
      ? label
      : locale === "en"
        ? "Close chat"
        : locale === "uk"
          ? "Закрити чат"
          : "Закрыть чат";
  };
})();
