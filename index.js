// ==UserScript==
// @name         yc-抖音PC端识别跳转代码
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  抖音PC端识别跳转代码
// @author       wcbblll
// @match        https://www.douyin.com/*
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";
  // 标签父盒子
  const mainTagBoxClass = '.j5WZzJdp.IoRNNcMW.hVNC9qgC'
  // 关注
  const starClass = '.Ea6pNaMO'
  // 这些自动跳过，直接下一个视频
  const excludeList = ['漫画', '国漫', '修仙', '玄幻', '系统', '动画', '小说']
  // 包含自动加关注
  const includeList = ['肉感', '微胖', '辣妹', '穿搭', '变装']

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
    setVideoTime()
    autoOpenComment()
    autoStar()
    autoSkip()
  })

  // 获取页面中面积最大的video
  function getMaxAreaVideo() {
    const videos = document.querySelectorAll("video");
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const rect = video.getBoundingClientRect();
      if (rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)) return video
    }

    return null;
  }


  function matchTimeStr(timeStr, offset) {
    const regex =
      /\b((?:(?:[01]?\d|2[0-3]):[0-5]\d:[0-5]\d)|(?:(?:[01]?\d|2[0-3]):[0-5]\d)|(?:[1-9]|1[0-2]):[0-5]\d\s*(?:AM|PM))\b/g;
    const matches = timeStr.matchAll(regex);
    for (const match of matches) {
      const index = match["index"];
      match.lastIndex = index + match[0].length;
      if (offset >= index && offset < match.lastIndex) {
        return match[0]
      }
    }
    return null;
  }


  function timeToSeconds(timeStr) {
    const parts = timeStr.split(":").map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  // 跳转代码0:24 00:28 1:34 00:2:35
  // 遍历节点，非文本节点不处理，匹配文本节点中的时间字符串，使用timeToSeconds处理，并添加点击事件
  function setVideoTime() {
    const ID = 'addListener'
    // 评论区
    // const comments = document.querySelectorAll("span[class='sU2yAQQU']");
    const commentBody = document.querySelector(`#merge-all-comment-container:not([${ID}])`);
    if (!commentBody) return
    commentBody.setAttribute(ID, true)
    commentBody.addEventListener('click', (e) => {
      console.log('执行');
      const targetNode = e.target
      if (targetNode.nodeName !== 'SPAN') return
      let range;
      let textNode;
      let offset;

      if (document.caretPositionFromPoint) {
        range = document.caretPositionFromPoint(e.clientX, e.clientY);
        textNode = range.offsetNode;
        offset = range.offset;
      } else if (document.caretRangeFromPoint) {
        // 使用 WebKit 专有回退方法
        range = document.caretRangeFromPoint(e.clientX, e.clientY);
        textNode = range.startContainer;
        offset = range.startOffset;
      } else {
        // 两个方法都不支持，什么都不做
        return;
      }
      const match = matchTimeStr(targetNode.innerText, offset)
      if (!match) return
      const currentTime = timeToSeconds(match)
      const video = getMaxAreaVideo()
      if (!video) return
      if (video.duration >= currentTime) {
        video.currentTime = currentTime
      }
    })
  }

  function triggerKeyboardEvent(eventType, eventData) {
    const event = new KeyboardEvent(eventType, eventData);
    document.dispatchEvent(event);
  }

  // 是否在直播（非全屏，仅头像显示在直播）
  function isPlaying() {
    const star = [...document.querySelectorAll(starClass)].filter(item => isElementInViewportAndVisible(item))
    return star.length === 0
  }
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


  // 自动打开评论区
  function autoOpenComment() {
    const commentBody = document.querySelector(`#relatedVideoCard`);
    if (commentBody) return
    if (isVideoing()) return
    triggerKeyboardEvent("keydown", { keyCode: 88, key: "x", code: "KeyX" });
  }

  // 自动关注
  function autoStar() {
    // 直播中不处理
    if (isPlaying()) return
    const hasStarFlag = hasStar()
    if (typeof hasStarFlag === 'string' || hasStarFlag) return
    // j5WZzJdp IoRNNcMW hVNC9qgC

    // 是否已关注
    function hasStar() {
      const star = [...document.querySelectorAll(starClass)].filter(item => isElementInViewportAndVisible(item))
      if (star.length != 1) return 'unknow'
      const starItem = star[0]
      return starItem.parentNode.children[0] !== starItem
    }
    const mainTagBox = [...document.querySelectorAll(mainTagBoxClass)].filter(item => isElementInViewportAndVisible(item))
    if (!mainTagBox.length) return
    const tagList = mainTagBox[0].querySelectorAll('span')
    const tagLen = tagList.length
    for (let i = 0; i < tagLen; i++) {
      const item = tagList[i];
      const text = item.innerText
      if (!text.startsWith('#')) continue
      if (includeList.some(item => text.includes(item))) {
        console.log('关注了');
        triggerKeyboardEvent("keydown", { keyCode: 71, key: "g", code: "KeyG" });
        continue
      }
    }
  }

  // 直播自动跳过
  function autoSkip() {
    if (isVideoing()) {
      console.log('video playing');
      triggerKeyboardEvent("keydown", { keyCode: 40, key: "ArrowDown", code: "ArrowDown" });
      return
    }
    const mainTagBox = [...document.querySelectorAll(mainTagBoxClass)].filter(item => isElementInViewportAndVisible(item))
    if (!mainTagBox.length) return
    const tagList = mainTagBox[0].querySelectorAll('span')
    const tagLen = tagList.length
    let flag = false
    for (let i = 0; i < tagLen; i++) {
      const item = tagList[i];
      const text = item.innerText
      if (!text.startsWith('#')) continue
      if (excludeList.some(item => text.includes(item))) {
        console.log('跳过：', text);
        flag = true
        continue
      }
    }
    flag && triggerKeyboardEvent("keydown", { keyCode: 40, key: "ArrowDown", code: "ArrowDown" });
  }
})();
