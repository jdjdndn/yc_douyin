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
  const mainTagBoxClass = '.title'
  // 已添加标签后不自动切换
  const noChangeTag = 'wantLook'
  // 这些自动跳过，直接下一个视频
  const excludeList = ['抽象', '漫画', '国漫', '修仙', '玄幻', '系统', '动画', '动漫', '小说', '黑神话', '解说', '好剧', '儿童', '孩子', '观影', '案件', '国学', '狗', '猫', '宠物', '娃', '王者荣耀', '射手', '对抗路', '中单', '上单', '打野', '巅峰赛', '游戏日常', '综艺', '游戏', '美食', '测评', '小品', '春晚', '相亲', '恋爱', '情侣日常', '情感', '国服', '驾照', '考试', '结婚', '率土之滨', '程序员', '前端', '动物', '电商', '追剧', '军旅']
  // 包含自动加关注
  const includeList = ['ootd']
  // '肉感', '微胖', '辣妹', '穿搭', '变装', '纯欲', '斩男', '涞觅润丝', 'jk', '小妈', '感觉至上', '反差', '对镜拍', '甜妹', '幽灵娘', '慢摇', '身材', '摇一摇', '扭一扭', '无不良', '性感', '浅跳一下', '腰臀比', '御姐', '穿什么', '大长腿', '身材', '原相机', '蜜大腿', '轻熟', '后背摇', '颜值'

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
    skipAD()
    const video = findOne('video')
    // 视频暂停状态
    if (video && video.getAttribute(noChangeTag)) return
    autoStar()
    autoSkip()
  })

  function setVideoTag() {
    const video = findOne('video')
    if (video) {
      const videos = [...document.querySelectorAll('video')]
      const index = videos.findIndex(item => video === item)
      const prevVideo = videos[index - 1]
      prevVideo && prevVideo.setAttribute(noChangeTag, true)
    }
  }
  document.addEventListener('keyup', e => {
    if (e.key === 'ArrowUp') {
      setVideoTag()
    }
  })
  document.addEventListener('wheel', e => {
    // 向上滚轮
    if (e.wheelDeltaY > 0) {
      setVideoTag()
    }
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

  // 获取关注按钮的class
  // function getStarClass() {
  //   const star = document.querySelector('[hidden]') || findOne('[data-e2e=feed-follow-icon]')
  //   return star ? '.' + star.className : null
  // }

  // 是否在直播（非全屏，仅头像显示在直播）
  function isPlaying() {
    // const starClass = getStarClass()
    // if (!starClass) return false
    // const star = [...document.querySelectorAll(starClass)].filter(item => isElementInViewportAndVisible(item))
    // return star.length === 0
  }
  // 是否在直播（全屏，整个画面都是直播）
  function isVideoing() {
    // #slider-card
    // let flag = false
    // const tag = document.querySelector('.semi-tag-content.semi-tag-content-ellipsis')
    // flag = tag && tag.innerText === '直播中' && isElementInViewportAndVisible(tag)
    // if (flag) return flag
    // const msgBox = findOne('.EhebFia2')
    // if (msgBox && msgBox.innerText.includes('进入直播间')) return true
    // return false
    const sliderCard = findOne('main') || findOne('#slider-card')
    if (!sliderCard) return false
    const text = sliderCard.innerText
    const list = ['点击或按', '进入直播间']
    return list.every(it => text.includes(it))
  }

  function isElementInViewportAndVisible(element) {
    const rect = element.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.left >= 0 && rect.right <= window.innerWidth && rect.bottom <= window.innerHeight && rect.width != 0 && rect.height != 0
    return isVisible && (window.getComputedStyle(element).display !== 'none');
  }

  // 找到唯一一个在页面中的元素
  function findOne(selector) {
    const list = [...document.querySelectorAll(selector)].filter(item => isElementInViewportAndVisible(item))
    if (list.length == 1) return list[0]
    return null
  }

  // 自动打开评论区
  function autoOpenComment() {
    if (isVideoing()) return
    const commentBodyParent = findOne('#sliderVideo')
    if (!commentBodyParent || !commentBodyParent.children) return
    if (isElementInViewportAndVisible(commentBodyParent.children[1])) return
    triggerKeyboardEvent("keydown", { keyCode: 88, key: "x", code: "KeyX" });
  }

  // 视频标签内容
  let tagBoxText = null
  // 自动关注
  function autoStar() {
    // 直播中不处理
    // if (isPlaying()) return
    // const hasStarFlag = hasStar()
    // console.log('hasStarFlag', hasStarFlag);
    // if (hasStarFlag || !hasNoStar()) return

    // 是否已关注
    // function hasStar() {
    //   const starClass = getStarClass()
    //   console.log('starClass', starClass);
    //   // if (!starClass) return 'unknow'
    //   if (!starClass) return false
    //   const star = [...document.querySelectorAll(starClass)].filter(item => isElementInViewportAndVisible(item))
    //   if (star.length != 1) return 'unknow'
    //   const starItem = star[0]
    //   return starItem.parentNode.children[0] !== starItem
    // }
    // 根据svg的viewBox属性判断图标大小，关注加号图标大小为 0 0 32 33
    function hasNoStar() {
      return [...document.querySelectorAll('svg')].filter(it => it.viewBox.animVal.width === 32 && it.viewBox.animVal.height === 33 && isElementInViewportAndVisible(it)).length === 1
    }
    if (!hasNoStar()) return
    const mainTagBox = [...document.querySelectorAll(mainTagBoxClass)].filter(item => isElementInViewportAndVisible(item))
    // console.log('mainTagBox', mainTagBox);
    if (!mainTagBox.length) return
    const mainTagBoxText = mainTagBox[0].innerText
    // 两次获取的标签内容相同，说明已经关注了
    if (tagBoxText && mainTagBoxText == tagBoxText) return
    const tagList = mainTagBox[0].querySelectorAll('span')
    const tagLen = tagList.length
    // 记录是否关注的变量，关注就不排除不喜欢的视频
    let flag = false
    for (let i = 0; i < tagLen; i++) {
      const item = tagList[i];
      const text = item.innerText
      if (!text.startsWith('#')) continue
      if (includeList.some(item => text.includes(item))) {
        // 两次获取的标签内容相同，说明已经关注了
        if (tagBoxText && mainTagBoxText == tagBoxText) break
        tagBoxText = mainTagBoxText
        console.log('关注了', item.innerText);
        flag = true
        triggerKeyboardEvent("keydown", { keyCode: 71, key: "g", code: "KeyG" });
        break
      }
    }
    if (flag) return
    for (let i = 0; i < tagLen; i++) {
      const item = tagList[i];
      const text = item.innerText
      if (!text.startsWith('#')) continue
      if (excludeList.some(item => text.includes(item))) {
        console.log('不感兴趣：', text);
        triggerKeyboardEvent("keydown", { keyCode: 40, key: "ArrowDown", code: "ArrowDown" });
        // triggerKeyboardEvent("keydown", { keyCode: 82, key: "r", code: "KeyR" })
        break
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
  }

  // 广告自动跳过
  function skipAD() {
    const commentTab = findOne('#semiTabcomment')
    if (!commentTab) return
    if (commentTab.previousSibling) return
    console.log('跳过广告1');
    triggerKeyboardEvent("keydown", { keyCode: 82, key: "r", code: "KeyR" });
  }
})();
