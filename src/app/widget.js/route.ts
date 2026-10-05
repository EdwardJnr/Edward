// The embed script: <script src="https://APP/widget.js" data-bot="BOT_ID" async></script>
const SCRIPT = `(function () {
  var s = document.currentScript;
  if (!s || !s.dataset.bot) return;
  var origin = new URL(s.src).origin;
  var open = false;
  var btn = document.createElement("button");
  btn.setAttribute("aria-label", "Chat with us");
  btn.innerHTML = "&#128172;";
  btn.style.cssText = "position:fixed;right:20px;bottom:20px;width:58px;height:58px;border-radius:50%;border:0;background:#0F4C3A;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25);z-index:2147483646";
  var frame = document.createElement("iframe");
  frame.src = origin + "/embed/" + encodeURIComponent(s.dataset.bot);
  frame.title = "Chat";
  frame.style.cssText = "position:fixed;right:20px;bottom:90px;width:370px;max-width:calc(100vw - 40px);height:540px;max-height:calc(100vh - 120px);border:0;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.25);display:none;z-index:2147483647;background:#fff";
  btn.onclick = function () { open = !open; frame.style.display = open ? "block" : "none"; btn.innerHTML = open ? "&times;" : "&#128172;"; };
  document.body.appendChild(frame);
  document.body.appendChild(btn);
})();`;

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
