import { useEffect } from "react";

function useCloseOthersOnToggle() {
    useEffect(() => {
        const onPointerDown = (ev) => {
            const toggle = ev.target.closest('[data-bs-toggle="dropdown"]');
            if (!toggle) return;

            const currentDropdown = toggle.closest(".dropdown");

            // Close all open menus
            document.querySelectorAll(".dropdown-menu.show").forEach((menu) => {
                const dd = menu.closest(".dropdown");
                if (!dd || dd === currentDropdown) return;

                try {
                    const D = (window.bootstrap && window.bootstrap.Dropdown) || window.Dropdown;
                    if (D) {
                        const otherToggle = dd.querySelector('[data-bs-toggle="dropdown"]');
                        if (otherToggle) (D.getInstance(otherToggle) || new D(otherToggle)).hide();
                        return;
                    }
                } catch {
                    // no-op
                }

                menu.classList.remove("show");
                const otherToggle = dd.querySelector('[data-bs-toggle="dropdown"]');
                if (otherToggle) otherToggle.setAttribute("aria-expanded", "false");
            });
        };

        document.addEventListener("pointerdown", onPointerDown, true);
        return () => document.removeEventListener("pointerdown", onPointerDown, true);
    }, []);
}

export default useCloseOthersOnToggle;
