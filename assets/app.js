/* TikTokプレビューUI — app.js
   閲覧専用の内部確認ツール。UI内フィードバック機能なし。
   window.FEED は build.py がビルド時にインライン注入する。 */
(function () {
  "use strict";

  var FEED = window.FEED || { account: {}, posts: [] };
  var ACCOUNT = FEED.account || {};
  var POSTS = FEED.posts || [];

  var feedEl = document.getElementById("feed");
  var feedView = document.getElementById("feed-view");
  var profileView = document.getElementById("profile-view");
  var backdrop = document.getElementById("backdrop");
  var commentSheet = document.getElementById("comment-sheet");
  var infoSheet = document.getElementById("info-sheet");

  var likedSet = new Set();
  var currentInfoPostId = null;

  // ---------------------------------------------------------------
  // ユーティリティ
  // ---------------------------------------------------------------
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function linkifyTags(s) {
    return escapeHtml(s).replace(/#[^\s#]+/g, function (m) {
      return '<span class="tag">' + m + "</span>";
    });
  }

  function renderCaptionHTML(body, hashtags) {
    var html = linkifyTags(body || "");
    if (hashtags && hashtags.length) {
      var tagsHtml = hashtags
        .map(function (t) {
          return '<span class="tag">' + escapeHtml(t) + "</span>";
        })
        .join(" ");
      html += (body ? "<br><br>" : "") + tagsHtml;
    }
    return html;
  }

  function avatarUrl() {
    var a = ACCOUNT.avatar;
    if (!a || a === "auto") return "assets/avatar.svg";
    return a;
  }

  var SVG = {
    heart:
      '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10.2-9.3C.2 8.7 1.6 5 5.2 4.2c2.1-.5 4 .5 5.1 2.1C11.4 4.7 13.3 3.7 15.4 4.2 19 5 20.4 8.7 18.9 11.7 16.2 16.4 12 21 12 21z"/></svg>',
    comment:
      '<svg viewBox="0 0 24 24"><path d="M4 4h16v12H8.5L4 20V4z" fill="none" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    bookmark:
      '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4.2L6 21V3z" fill="none" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    share:
      '<svg viewBox="0 0 24 24"><path d="M14 3v5c-6 1-9 5-10 11 2.5-3.8 5.6-5.6 10-5.9V18l7-7.5L14 3z"/></svg>',
  };

  // ---------------------------------------------------------------
  // フィード描画
  // ---------------------------------------------------------------
  function renderSlide(post, img, idx, isFirstPost) {
    var eager = isFirstPost && idx === 0;
    var bgLayer =
      post.bg === "blur"
        ? '<div class="slide-bgblur" style="background-image:url(\'' + img.url + "')\"></div>"
        : "";
    var srcAttr = eager ? ' src="' + img.url + '"' : ' data-src="' + img.url + '"';
    var loadingAttr = eager ? "eager" : "lazy";
    return (
      '<div class="slide" data-bg="' +
      (post.bg || "black") +
      '">' +
      bgLayer +
      '<img class="slide-media"' +
      srcAttr +
      ' loading="' +
      loadingAttr +
      '" decoding="async" alt="">' +
      '<div class="nav-zone left" data-nav="prev"></div>' +
      '<div class="nav-zone right" data-nav="next"></div>' +
      "</div>"
    );
  }

  function renderVideoSlide(post, isFirstPost) {
    var v = post.video;
    return (
      '<div class="slide" data-bg="' +
      (post.bg || "black") +
      '">' +
      '<video class="slide-media" muted playsinline loop preload="metadata" data-src="' +
      v.url +
      '"></video>' +
      '<div class="nav-zone left" data-nav="prev"></div>' +
      '<div class="nav-zone right" data-nav="next"></div>' +
      "</div>"
    );
  }

  function renderPost(post, index) {
    var isVideo = post.type === "video" && post.video;
    var slidesHtml = isVideo
      ? renderVideoSlide(post, index === 0)
      : (post.images || [])
          .map(function (img, i) {
            return renderSlide(post, img, i, index === 0);
          })
          .join("");

    var slideCount = isVideo ? 1 : (post.images || []).length;
    var showMulti = !isVideo && slideCount > 1;

    var pageBadge = showMulti
      ? '<div class="page-badge">1/' + slideCount + "</div>"
      : "";
    var dots = showMulti
      ? '<div class="dots">' +
        Array.from({ length: slideCount })
          .map(function (_, i) {
            return '<span class="dot' + (i === 0 ? " active" : "") + '"></span>';
          })
          .join("") +
        "</div>"
      : "";

    var idBadge = post.batch_label
      ? '<div class="id-badge">' +
        escapeHtml(post.batch_label) +
        "</div>"
      : "";

    var captionHtml = renderCaptionHTML(post.caption_body, post.hashtags);

    var musicText = post.music || ACCOUNT.default_music || "";
    var musicMarquee = musicText.length > 18 ? " marquee" : "";

    return (
      '<article class="post" data-id="' +
      post.id +
      '" data-index="' +
      index +
      '">' +
      '<div class="slides">' +
      slidesHtml +
      "</div>" +
      idBadge +
      pageBadge +
      dots +
      '<div class="rail">' +
      '<div class="rail-avatar-wrap"><img src="' +
      avatarUrl() +
      '" alt=""><span class="rail-plus">+</span></div>' +
      '<button class="rail-btn heart" data-action="like" aria-label="いいね">' +
      SVG.heart +
      "</button>" +
      '<button class="rail-btn comment" data-action="comment" aria-label="コメント">' +
      SVG.comment +
      "</button>" +
      '<button class="rail-btn bookmark" aria-label="しおり" tabindex="-1">' +
      SVG.bookmark +
      "</button>" +
      '<button class="rail-btn share" aria-label="シェア" tabindex="-1">' +
      SVG.share +
      "</button>" +
      '<div class="rail-record"></div>' +
      "</div>" +
      '<div class="caption-area">' +
      '<div class="cap-handle">@' +
      escapeHtml(ACCOUNT.handle) +
      "</div>" +
      '<div class="cap-text-wrap">' +
      '<div class="cap-text">' +
      captionHtml +
      "</div>" +
      '<button class="cap-toggle" data-action="toggle-cap" hidden>続きを読む</button>' +
      "</div>" +
      '<div class="cap-music">' +
      '<svg viewBox="0 0 24 24" width="12" height="12" fill="#fff"><path d="M9 18V5l11-2v13" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="6.5" cy="18" r="2.5" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="17.5" cy="16" r="2.5" fill="none" stroke="#fff" stroke-width="1.6"/></svg>' +
      '<span class="cap-music-text' +
      musicMarquee +
      '"><span>' +
      escapeHtml(musicText) +
      (musicMarquee ? "&nbsp;&nbsp;&nbsp;&nbsp;" + escapeHtml(musicText) : "") +
      "</span></span>" +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function renderFeed() {
    feedEl.innerHTML = POSTS.map(renderPost).join("");
    wireHorizontalSlides();
    measureCaptionOverflow();
    setupVerticalObserver();
    setupVideoObserver();
  }

  // ---------------------------------------------------------------
  // 横スライド(フォトモード)制御: バッジ/ドット更新
  // ---------------------------------------------------------------
  function wireHorizontalSlides() {
    var postEls = feedEl.querySelectorAll(".post");
    postEls.forEach(function (postEl) {
      var slidesEl = postEl.querySelector(".slides");
      if (!slidesEl) return;
      var update = debounce(function () {
        updateSlideIndicators(postEl, slidesEl);
      }, 150);
      slidesEl.addEventListener("scroll", update, { passive: true });
      slidesEl.addEventListener("scrollend", function () {
        updateSlideIndicators(postEl, slidesEl);
      });
    });
  }

  function updateSlideIndicators(postEl, slidesEl) {
    var w = slidesEl.clientWidth || 1;
    var idx = Math.round(slidesEl.scrollLeft / w);
    var badge = postEl.querySelector(".page-badge");
    var dots = postEl.querySelectorAll(".dot");
    if (badge) badge.textContent = idx + 1 + "/" + dots.length;
    dots.forEach(function (d, i) {
      d.classList.toggle("active", i === idx);
    });
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      clearTimeout(t);
      var args = arguments;
      t = setTimeout(function () {
        fn.apply(null, args);
      }, ms);
    };
  }

  // ---------------------------------------------------------------
  // キャプション折りたたみ: 2行超過時のみトグルボタン表示
  // ---------------------------------------------------------------
  function measureCaptionOverflow() {
    // rAFはタブ非表示だと発火しないブラウザがあるためsetTimeoutで確実に実行する
    setTimeout(function () {
      feedEl.querySelectorAll(".post").forEach(function (postEl) {
        var textEl = postEl.querySelector(".cap-text");
        var btn = postEl.querySelector(".cap-toggle");
        if (!textEl || !btn) return;
        if (textEl.scrollHeight > textEl.clientHeight + 2) {
          btn.hidden = false;
        }
      });
    }, 0);
  }

  // ---------------------------------------------------------------
  // 縦IntersectionObserver: 次投稿カバー先読み + 現在post把握
  // ---------------------------------------------------------------
  function setupVerticalObserver() {
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            preloadPostImages(entry.target);
          }
        });
      },
      { root: null, rootMargin: "100% 0px 100% 0px", threshold: 0 }
    );
    feedEl.querySelectorAll(".post").forEach(function (p) {
      io.observe(p);
    });
  }

  function preloadPostImages(postEl) {
    postEl.querySelectorAll("img.slide-media[data-src]").forEach(function (img) {
      if (!img.getAttribute("src")) {
        img.setAttribute("src", img.getAttribute("data-src"));
      }
    });
  }

  // ---------------------------------------------------------------
  // 動画: IntersectionObserver(threshold 0.6)でplay/pause + src差し込み
  // ---------------------------------------------------------------
  function setupVideoObserver() {
    if (!("IntersectionObserver" in window)) return;
    var videos = feedEl.querySelectorAll("video.slide-media");
    if (!videos.length) return;

    var loadIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target;
          if (entry.isIntersecting) {
            if (!v.getAttribute("src") && v.dataset.src) {
              v.setAttribute("src", v.dataset.src);
              v.load();
            }
          } else {
            v.pause();
            v.removeAttribute("src");
            v.load();
          }
        });
      },
      { root: null, rootMargin: "100% 0px 100% 0px", threshold: 0 }
    );

    var playIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            v.play().catch(function () {});
          } else {
            v.pause();
            v.currentTime = 0;
          }
        });
      },
      { root: null, threshold: 0.6 }
    );

    videos.forEach(function (v) {
      loadIO.observe(v);
      playIO.observe(v);
    });
  }

  // ---------------------------------------------------------------
  // クリック委任(いいね/コメント/続きを読む/横送りナビ/ℹ️)
  // ---------------------------------------------------------------
  feedEl.addEventListener("click", function (e) {
    var likeBtn = e.target.closest('[data-action="like"]');
    if (likeBtn) {
      likeBtn.classList.toggle("liked");
      return;
    }
    var commentBtn = e.target.closest('[data-action="comment"]');
    if (commentBtn) {
      var postEl = commentBtn.closest(".post");
      openCommentSheet(postEl.dataset.id);
      return;
    }
    var toggleBtn = e.target.closest('[data-action="toggle-cap"]');
    if (toggleBtn) {
      var wrap = toggleBtn.closest(".cap-text-wrap");
      var textEl = wrap.querySelector(".cap-text");
      var expanded = textEl.classList.toggle("expanded");
      toggleBtn.textContent = expanded ? "折りたたむ" : "続きを読む";
      return;
    }
    var navZone = e.target.closest(".nav-zone");
    if (navZone && window.matchMedia("(hover: hover)").matches) {
      var slidesEl = navZone.closest(".post").querySelector(".slides");
      var dir = navZone.dataset.nav === "next" ? 1 : -1;
      slidesEl.scrollBy({ left: dir * slidesEl.clientWidth, behavior: "smooth" });
      return;
    }
  });

  document.getElementById("info-btn").addEventListener("click", function () {
    var current = getCurrentPost();
    if (current) openInfoSheet(current.id);
  });

  function getCurrentPost() {
    var scrollTop = feedEl.scrollTop;
    var h = feedEl.clientHeight || 1;
    var idx = Math.round(scrollTop / h);
    return POSTS[idx] || POSTS[0];
  }

  // ---------------------------------------------------------------
  // コメントシート
  // ---------------------------------------------------------------
  function openCommentSheet(postId) {
    var post = POSTS.find(function (p) {
      return p.id === postId;
    });
    if (!post) return;
    var body = document.getElementById("comment-body");
    if (post.pinned_comment) {
      body.innerHTML =
        '<div class="pinned-comment">' +
        '<img class="pc-avatar" src="' +
        avatarUrl() +
        '" alt="">' +
        '<div class="pc-body">' +
        '<div class="pc-pin-label">📌 ピン留めされています</div>' +
        '<div class="pc-name-row">' +
        escapeHtml(ACCOUNT.display_name) +
        ' <span class="pc-chip">作成者</span></div>' +
        '<div class="pc-text">' +
        escapeHtml(post.pinned_comment) +
        "</div>" +
        "</div>" +
        '<span class="pc-heart">' +
        SVG.heart.replace("<svg ", '<svg width="15" height="15" fill="none" stroke="#fff" stroke-width="1.6" ') +
        "</span>" +
        "</div>";
    } else {
      body.innerHTML = '<div class="comment-empty">まだコメントはありません</div>';
    }
    openSheet(commentSheet);
  }

  // ---------------------------------------------------------------
  // ℹ️ 内部情報シート
  // ---------------------------------------------------------------
  function openInfoSheet(postId) {
    var post = POSTS.find(function (p) {
      return p.id === postId;
    });
    if (!post) return;
    currentInfoPostId = postId;
    var body = document.getElementById("info-body");
    var fullCaption =
      (post.caption_body || "") +
      (post.hashtags && post.hashtags.length
        ? "\n\n" + post.hashtags.join(" ")
        : "");

    var refBlock = post.ref_label
      ? '<div class="info-block"><div class="info-label">元投稿実績</div><div class="info-ref">' +
        escapeHtml(post.ref_label) +
        "</div></div>"
      : "";

    body.innerHTML =
      '<div class="info-block"><div class="info-label">内部タイトル</div><div class="info-title">' +
      escapeHtml(post.title || post.id) +
      "</div></div>" +
      refBlock +
      '<div class="info-block">' +
      '<div class="info-cap-head"><span class="info-label">キャプション全文</span>' +
      '<button class="info-copy-btn" id="info-copy-btn">コピー</button></div>' +
      '<div class="info-caption" id="info-caption-text">' +
      escapeHtml(fullCaption) +
      "</div>" +
      "</div>" +
      '<hr class="info-divider">' +
      '<div class="info-note">' +
      escapeHtml(ACCOUNT.posting_note || "") +
      "</div>";

    document.getElementById("info-copy-btn").addEventListener("click", function () {
      var btn = this;
      var text = fullCaption;
      var done = function () {
        btn.textContent = "コピーしました";
        btn.classList.add("copied");
        setTimeout(function () {
          btn.textContent = "コピー";
          btn.classList.remove("copied");
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          fallbackCopy(text);
          done();
        });
      } else {
        fallbackCopy(text);
        done();
      }
    });

    openSheet(infoSheet);
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {}
    document.body.removeChild(ta);
  }

  // ---------------------------------------------------------------
  // シート開閉共通
  // ---------------------------------------------------------------
  function openSheet(sheetEl) {
    // 同時に2枚重ねて開かないよう、先に両方閉じてから対象だけ開く
    commentSheet.classList.remove("open");
    infoSheet.classList.remove("open");
    backdrop.classList.add("show");
    sheetEl.classList.add("open");
  }
  function closeSheets() {
    backdrop.classList.remove("show");
    commentSheet.classList.remove("open");
    infoSheet.classList.remove("open");
  }
  backdrop.addEventListener("click", closeSheets);
  document.querySelectorAll(".sheet-close").forEach(function (btn) {
    btn.addEventListener("click", closeSheets);
  });

  // ---------------------------------------------------------------
  // プロフィール画面
  // ---------------------------------------------------------------
  function renderProfile() {
    document.getElementById("profile-avatar").innerHTML =
      '<img src="' + avatarUrl() + '" alt="">';
    document.getElementById("profile-handle").textContent = "@" + (ACCOUNT.handle || "");
    document.getElementById("profile-title").textContent = ACCOUNT.display_name || "プロフィール";
    document.getElementById("profile-bio").innerHTML = (ACCOUNT.bio || [])
      .map(function (line) {
        return escapeHtml(line);
      })
      .join("<br>");
    document.getElementById("profile-link-text").textContent = ACCOUNT.link_label || "";

    var grid = document.getElementById("profile-grid");
    grid.innerHTML = POSTS.map(function (post, i) {
      var isVideo = post.type === "video" && post.video;
      var cover = isVideo
        ? '<video src="' + post.video.url + '" muted playsinline preload="metadata"></video>'
        : '<img src="' + ((post.images || [])[0] || {}).url + '" loading="lazy" decoding="async" alt="">';
      var count = isVideo ? "" : (post.images || []).length;
      var badge = isVideo
        ? '<span class="p-tile-badge"><svg viewBox="0 0 24 24" width="11" height="11"><path d="M6 4l14 8-14 8V4z" fill="#fff"/></svg></span>'
        : count > 1
        ? '<span class="p-tile-badge"><svg viewBox="0 0 24 24" width="11" height="11"><rect x="3" y="6" width="14" height="14" rx="2.5" fill="#161616" stroke="#fff" stroke-width="1.6"/><path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3H19a1.5 1.5 0 0 1 1.5 1.5V15a1.5 1.5 0 0 1-1.5 1.5H18" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          count +
          "</span>"
        : "";
      return (
        '<div class="p-tile" data-id="' +
        post.id +
        '" data-jump-index="' +
        i +
        '">' +
        cover +
        badge +
        "</div>"
      );
    }).join("");

    grid.querySelectorAll(".p-tile").forEach(function (tile) {
      tile.addEventListener("click", function () {
        location.hash = "#/feed/" + tile.dataset.id;
      });
    });
  }

  // ---------------------------------------------------------------
  // ルーティング: #/feed , #/feed/<id> , #/profile
  // ---------------------------------------------------------------
  function activateView(name) {
    feedView.classList.toggle("active", name === "feed");
    profileView.classList.toggle("active", name === "profile");
  }

  function jumpToPost(postId, smooth) {
    var idx = POSTS.findIndex(function (p) {
      return p.id === postId;
    });
    if (idx < 0) idx = 0;
    var target = idx * feedEl.clientHeight;
    if (smooth) {
      feedEl.scrollTo({ top: target, behavior: "smooth" });
    } else {
      feedEl.scrollTop = target;
    }
  }

  function jumpToPostWhenReady(postId, attemptsLeft) {
    // レイアウト確定後にinstantジャンプ(smoothはiOS Safariのsnapと衝突するため厳禁)。
    // rAFはタブが非アクティブ/非表示だと発火しないブラウザがあるため、
    // rAF一発待ちに依存せずclientHeightが確定するまで短間隔でリトライする。
    if (feedEl.clientHeight > 0) {
      jumpToPost(postId, false);
      return;
    }
    if (attemptsLeft <= 0) {
      jumpToPost(postId, false); // 最終手段: 0でも試みる
      return;
    }
    setTimeout(function () {
      jumpToPostWhenReady(postId, attemptsLeft - 1);
    }, 32);
  }

  function route() {
    var hash = location.hash || "#/feed";
    var m = hash.match(/^#\/feed\/(.+)$/);
    if (m) {
      activateView("feed");
      jumpToPostWhenReady(decodeURIComponent(m[1]), 20);
    } else if (hash === "#/profile") {
      activateView("profile");
    } else {
      activateView("feed");
    }
  }

  window.addEventListener("hashchange", route);

  // ---------------------------------------------------------------
  // デスクトップ: 矢印キー操作(hover:hover環境のみ)
  // ---------------------------------------------------------------
  document.addEventListener("keydown", function (e) {
    if (!window.matchMedia("(hover: hover)").matches) return;
    if (!feedView.classList.contains("active")) return;
    if (e.key === "ArrowDown") {
      feedEl.scrollBy({ top: feedEl.clientHeight, behavior: "smooth" });
    } else if (e.key === "ArrowUp") {
      feedEl.scrollBy({ top: -feedEl.clientHeight, behavior: "smooth" });
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      var current = getCurrentPost();
      var postEl = feedEl.querySelector('.post[data-id="' + current.id + '"]');
      if (!postEl) return;
      var slidesEl = postEl.querySelector(".slides");
      if (!slidesEl) return;
      var dir = e.key === "ArrowRight" ? 1 : -1;
      slidesEl.scrollBy({ left: dir * slidesEl.clientWidth, behavior: "smooth" });
    }
  });

  // ---------------------------------------------------------------
  // 初期化
  // ---------------------------------------------------------------
  renderFeed();
  renderProfile();
  route();
})();
