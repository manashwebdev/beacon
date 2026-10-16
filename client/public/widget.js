/* Beacon embed widget. Usage: <script src="https://YOUR-APP/widget.js" data-project="your-slug" defer></script> */
(function () {
  var s = document.currentScript;
  if (!s) return;
  var slug = s.getAttribute("data-project");
  var color = s.getAttribute("data-color") || "#7cf5d4";
  var origin = new URL(s.src).origin;
  var f = document.createElement("iframe");
  f.title = "Feedback";
  f.style.cssText = "position:fixed;right:20px;bottom:76px;width:min(380px,calc(100vw - 40px));height:min(560px,calc(100vh - 110px));border:1px solid rgba(255,255,255,.18);border-radius:18px;z-index:2147483646;display:none;box-shadow:0 20px 60px rgba(0,0,0,.5);background:#05060d";
  var b = document.createElement("button");
  b.textContent = "Feedback";
  b.setAttribute("aria-label", "Give feedback");
  b.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:2147483646;padding:12px 18px;border:1px solid " + color + ";border-radius:999px;background:rgba(10,12,24,.78);color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:0 0 24px " + color + "66";
  b.onclick = function () {
    if (!f.src) f.src = origin + "/embed/" + encodeURIComponent(slug);
    f.style.display = f.style.display === "none" ? "block" : "none";
  };
  document.body.appendChild(f);
  document.body.appendChild(b);
})();
