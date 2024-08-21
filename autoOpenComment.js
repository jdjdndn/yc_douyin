// ==UserScript==
// @name         yc-抖音PC端自动打开评论区
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  抖音PC端识别跳转代码
// @author       wcbblll
// @match        https://www.douyin.com/*
// @run-at       document-end
// @license      MIT
// ==/UserScript==
(function () {
  "use strict";

  // 是否在直播（全屏，整个画面都是直播）
  function isVideoing() {
    const tag = document.querySelector('.semi-tag-content.semi-tag-content-ellipsis')
    return tag && tag.innerText === '直播中' && isElementInViewportAndVisible(tag)
  }

  function isElementInViewportAndVisible(element) {
    const rect = element.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.left >= 0 && rect.right < window.innerWidth && rect.bottom <= window.innerHeight && rect.width != 0 && rect.height != 0
    return isVisible && (window.getComputedStyle(element).display !== 'none');
  }

  // 找到唯一一个在页面中的元素
  function findOne(selector) {
    const list = [...document.querySelectorAll(selector)].filter(item => isElementInViewportAndVisible(item))
    if (list.length == 1) return list[0]
    return null
  }

  function triggerKeyboardEvent(eventType, eventData) {
    const event = new KeyboardEvent(eventType, eventData);
    document.dispatchEvent(event);
  }


  // 自动打开评论区
  function autoOpenComment() {
    if (isVideoing()) return
    // const commentBody = document.querySelector(`#relatedVideoCard`);
    // if (commentBody && isElementInViewportAndVisible(commentBody)) return
    const commentBodyParent = findOne('#sliderVideo')
    if (!commentBodyParent || !commentBodyParent.children) return
    if (isElementInViewportAndVisible(commentBodyParent.children[1])) return
    triggerKeyboardEvent("keydown", { keyCode: 88, key: "x", code: "KeyX" });
  }

  function loopFunc(fn) {
    function callback(mutationsList, observer) {
      if (lastExecutionTime + delay < Date.now()) {
        fn(mutationsList, observer)
        lastExecutionTime = Date.now();
      }
    }

    let observer = new MutationObserver(callback);

    let delay = 500; // 间隔时间，单位毫秒
    let lastExecutionTime = 0;

    observer.observe(document.body, { childList: true, attributes: true, subtree: true });
  }


  loopFunc(() => {
    autoOpenComment()
  })
})();
