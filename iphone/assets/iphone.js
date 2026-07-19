/* iPhone投稿キット — iphone.js
   データ組み立てはしない(HTML側でbuild.pyが完全に描画済み)。
   担当: ①コピー操作(クリップボード+iOSフォールバック) ②チェックリストのlocalStorage永続化
   ③下部バーの進捗表示。外部送信は一切なし。 */
(function () {
  "use strict";

  var STORAGE_KEY = "ttkit_progress_v1";

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* localStorage不可でも致命的ではないので握りつぶす */
    }
  }

  var state = loadState();

  // ---------------------------------------------------------------
  // チェックリスト: 復元 + 変更時保存 + 見た目のline-through + 進捗更新
  // ---------------------------------------------------------------
  var checks = Array.prototype.slice.call(document.querySelectorAll(".kit-check"));

  function applyCheckedClass(input) {
    var row = input.closest(".check-row");
    if (row) row.classList.toggle("checked", input.checked);
  }

  checks.forEach(function (input) {
    if (state[input.id]) {
      input.checked = true;
      applyCheckedClass(input);
    }
    input.addEventListener("change", function () {
      state[input.id] = input.checked;
      saveState(state);
      applyCheckedClass(input);
      updateProgress();
    });
  });

  function updateProgress() {
    var todayChecks = checks.filter(function (c) {
      return c.dataset.group === "today";
    });
    var doneCount = todayChecks.filter(function (c) {
      return c.checked;
    }).length;
    var label = document.getElementById("progress-label");
    var fill = document.getElementById("progress-fill");
    if (label) label.textContent = "今日のタスク " + doneCount + "/" + todayChecks.length;
    if (fill) {
      var pct = todayChecks.length ? (doneCount / todayChecks.length) * 100 : 0;
      fill.style.width = pct + "%";
    }
  }

  updateProgress();

  // ---------------------------------------------------------------
  // コピー操作: data-copy属性の値をクリップボードへ
  // ---------------------------------------------------------------
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      /* no-op */
    }
    document.body.removeChild(ta);
  }

  function showCopied(btn) {
    var original = btn.textContent;
    btn.textContent = "コピーしました";
    btn.classList.add("copied");
    setTimeout(function () {
      btn.textContent = original;
      btn.classList.remove("copied");
    }, 1600);
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".copy-btn");
    if (!btn || btn.disabled) return;
    var text = btn.dataset.copy || "";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(function () {
          showCopied(btn);
        })
        .catch(function () {
          fallbackCopy(text);
          showCopied(btn);
        });
    } else {
      fallbackCopy(text);
      showCopied(btn);
    }
  });

  // ---------------------------------------------------------------
  // クイックナビ / 下部chipのアクティブ表示(現在地の目安)
  // ---------------------------------------------------------------
  if ("IntersectionObserver" in window) {
    var sections = document.querySelectorAll(".card[id], section[id]");
    var chips = document.querySelectorAll(".nav-chip");
    if (chips.length && sections.length) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var id = entry.target.id;
            chips.forEach(function (chip) {
              var match = chip.getAttribute("href") === "#" + id;
              chip.classList.toggle("active", match);
            });
          });
        },
        { rootMargin: "-40% 0px -50% 0px" }
      );
      sections.forEach(function (s) {
        io.observe(s);
      });
    }
  }
})();
