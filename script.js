/* ==========================================================
   script.js - SmackStyle
   No framework. Every block is guarded, so this file is safe
   to load on every page even when its markup is not present.
   ========================================================== */

(function () {
    "use strict";

    var byId = function (id) { return document.getElementById(id); };


    /* -----------------mobile navigation----------------- */

    var toggle = byId("nav-toggle");

    if (toggle) {

        var setNav = function (open) {
            document.body.classList.toggle("nav-open", open);
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
            toggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
        };

        toggle.addEventListener("click", function () {
            setNav(!document.body.classList.contains("nav-open"));
        });

        /* any link tap closes the panel */
        document.querySelectorAll(".header-nav a, .cat-nav a").forEach(function (link) {
            link.addEventListener("click", function () { setNav(false); });
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") { setNav(false); }
        });

        document.addEventListener("click", function (e) {
            if (!document.body.classList.contains("nav-open")) { return; }
            if (toggle.contains(e.target)) { return; }
            if (e.target.closest(".header-nav, .searchbar")) { return; }
            setNav(false);
        });

        /* going back to a wide screen must not leave the page locked */
        var wide = window.matchMedia("(min-width: 1025px)");
        var onWide = function (e) { if (e.matches) { setNav(false); } };
        if (wide.addEventListener) { wide.addEventListener("change", onWide); }
        else if (wide.addListener) { wide.addListener(onWide); }
    }


    /* -----------------sticky header shadow----------------- */

    var header = byId("site-header");

    if (header) {

        var onScroll = function () {
            header.classList.toggle("is-stuck", window.scrollY > 8);
        };

        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
    }


    /* -----------------highlight the current page----------------- */

    var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();

    /* only the first match lights up, otherwise the two category
       links that both point at product.html would both highlight */
    [[".header-nav-links", "aria-current"], [".product-nav-link", null]].forEach(function (pair) {
        var done = false;
        document.querySelectorAll(pair[0]).forEach(function (link) {
            if (done) { return; }
            var target = (link.getAttribute("href") || "").split("/").pop().toLowerCase();
            if (target !== here) { return; }
            done = true;
            link.classList.add("is-active");
            if (pair[1]) { link.setAttribute(pair[1], "page"); }
        });
    });


    /* -----------------cart counter (local only)----------------- */

    var cartCount = byId("cart-count");
    var CART_KEY = "smackstyle.cart";

    var readCart = function () {
        try {
            var n = parseInt(localStorage.getItem(CART_KEY) || "0", 10);
            return isNaN(n) || n < 0 ? 0 : n;
        } catch (err) {
            return 0;
        }
    };

    var writeCart = function (n) {
        try { localStorage.setItem(CART_KEY, String(n)); } catch (err) { /* private mode */ }
        if (cartCount) { cartCount.textContent = n; cartCount.dataset.count = String(n); }
    };

    if (cartCount) {
        cartCount.textContent = readCart();
        cartCount.dataset.count = cartCount.textContent;
    }

    document.querySelectorAll(".card-add").forEach(function (btn) {

        btn.addEventListener("click", function () {

            writeCart(readCart() + 1);

            var label = btn.querySelector("span") || btn;
            if (btn.dataset.done === "1") { return; }
            btn.dataset.done = "1";
            label.textContent = "Added to cart";
            btn.classList.add("is-added");

            window.setTimeout(function () {
                btn.dataset.done = "0";
                label.textContent = "Add to cart";
                btn.classList.remove("is-added");
            }, 1800);
        });
    });


    /* -----------------login / signup forms----------------- */
    /* There is no backend yet, so validation runs in the browser
       and the submit is cancelled instead of reloading the page. */

    var FORMS = [
        {
            id: "login-form",
            done: "Login details look good. Connecting to a server comes next.",
            check: function () { return []; }
        },
        {
            id: "signup-form",
            done: "Account details look good. Connecting to a server comes next.",
            check: function (data) {
                var problems = [];
                if (data.password !== data.confirm) {
                    problems.push("The two passwords do not match.");
                } else if (data.password && data.password.length < 8) {
                    problems.push("Password must be at least 8 characters.");
                }
                return problems;
            }
        }
    ];

    FORMS.forEach(function (entry) {

        var form = byId(entry.id);
        if (!form) { return; }

        var note = form.querySelector(".form-note");
        if (!note) {
            note = document.createElement("p");
            note.className = "form-note";
            note.setAttribute("role", "status");
            note.setAttribute("aria-live", "polite");
            form.appendChild(note);
        }

        var say = function (message, isError) {
            note.textContent = message;
            note.classList.toggle("form-note-error", !!isError);
        };

        form.addEventListener("submit", function (event) {

            event.preventDefault();

            var data = {};
            if (window.FormData) {
                new FormData(form).forEach(function (value, key) { data[key] = value; });
            } else {
                new FormDataPolyfill(form, data);
            }

            /* let the browser handle empty required fields first */
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            var problems = entry.check(data);
            say(problems.length ? problems.join(" ") : entry.done, problems.length > 0);
        });
    });

    /* very old browsers only */
    function FormDataPolyfill(form, out) {
        Array.prototype.forEach.call(form.elements, function (el) {
            if (el.name) { out[el.name] = el.value; }
        });
        return out;
    }


    /* -----------------password strength meter----------------- */

    var pwField = byId("pw");
    var pwFill = document.querySelector(".strength-fill");
    var pwLabel = document.querySelector(".strength-label");

    if (pwField && pwFill && pwLabel) {

        var score = function (v) {
            var s = 0;
            if (v.length >= 8) { s++; }
            if (v.length >= 12) { s++; }
            if (/[A-Z]/.test(v) && /[a-z]/.test(v)) { s++; }
            if (/\d/.test(v)) { s++; }
            if (/[^A-Za-z0-9]/.test(v)) { s++; }
            return s;
        };

        var LEVELS = [
            { w: "0%", c: "transparent", t: "Strength" },
            { w: "20%", c: "#e11d48", t: "Weak" },
            { w: "40%", c: "#f59e0b", t: "Fair" },
            { w: "60%", c: "#eab308", t: "Good" },
            { w: "80%", c: "#22c55e", t: "Strong" },
            { w: "100%", c: "#0f8f83", t: "Very strong" }
        ];

        pwField.addEventListener("input", function () {
            var level = LEVELS[pwField.value ? score(pwField.value) : 0];
            pwFill.style.width = level.w;
            pwFill.style.backgroundColor = level.c;
            pwLabel.textContent = level.t;
        });
    }


    /* -----------------newsletter + search (no backend yet)----------------- */

    var NEWSLETTER_MSG = "Thanks. Connecting this form to a mailing list comes next.";

    [byId("newsletter-form"), byId("search-form")].forEach(function (form) {

        if (!form) { return; }

        form.addEventListener("submit", function (event) {

            event.preventDefault();

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            var note = form.querySelector(".form-note");
            if (!note) {
                note = document.createElement("p");
                note.className = "form-note";
                note.setAttribute("role", "status");
                form.appendChild(note);
            }

            if (form.id === "search-form") {
                window.alert("Search is not connected yet. Browse the categories above instead.");
                return;
            }

            note.textContent = NEWSLETTER_MSG;
            note.classList.remove("form-note-error");
            form.reset();
        });
    });

})();
