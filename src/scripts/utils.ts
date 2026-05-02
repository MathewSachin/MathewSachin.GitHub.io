export function addListeners<T extends Element = Element>(selector: string, event: string, handler: (el: T) => void) {
  document.querySelectorAll(selector).forEach(function (el) {
    el.addEventListener(event, function () { handler(el as unknown as T); });
  });
}
