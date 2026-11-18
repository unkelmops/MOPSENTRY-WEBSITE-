// Brief full-screen "power on" glow when the robot is started.
export function igniteApp() {
  if (typeof document === "undefined") return;
  const body = document.body;
  body.classList.remove("app-ignite");
  void body.offsetWidth;
  body.classList.add("app-ignite");
  window.setTimeout(() => body.classList.remove("app-ignite"), 1800);
}
