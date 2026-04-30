import { registerCopyToClipboard } from './utils';

(function () {
    // Copy code button
    document.querySelectorAll(".btn-clip").forEach(function (btn) {
        const selector = btn.getAttribute("data-clipboard-target");
        const target = selector ? document.querySelector(selector) : null;
        if (!target) return;

        registerCopyToClipboard(
            btn as HTMLElement,
            () => target.textContent,
            btn.querySelector("i"),
        );
    });

    // Copy post link button
    const copyPostLink = document.getElementById("copy-post-link");
    if (copyPostLink) {
        registerCopyToClipboard(
            copyPostLink,
            () => window.location.href,
            copyPostLink.querySelector("i"),
        );
    }
}());
