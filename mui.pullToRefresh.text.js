/**
 * 下拉刷新插件修改版 BY：Alen 将下拉刷新插件修改为文字提示增加返回到顶部函数，修复官方的scrollTo无效的BUG
 * 使用方法：直接在页面引入即可
 * @param {Object} $
 */
(function($) {
	var STATE_BEFORECHANGEOFFSET = 'beforeChangeOffset';
	var STATE_AFTERCHANGEOFFSET = 'afterChangeOffset';
	
	var CLASS_PULL_TOP_TIPS = $.className('pull-top-pocket');
	var CLASS_HIDDEN = $.className('hidden');
	var CLASS_BLOCK = $.className('block');
	var CLASS_SHOW = $.className('visibility');
	var CLASS_PULL_LOADING = $.className('pull-loading');
	var CLASS_PULL_CONTENT = $.className('pull-caption');
	var SELECTOR_PULL_LOADING = '.' + CLASS_PULL_LOADING;
	var SELECTOR_PULL_CONTENT = '.' + CLASS_PULL_CONTENT;
	var CLASS_TRANSITIONING = $.className('transitioning');
	
	var CLASS_PULL_TOP_ARROW = $.className('pull-loading') + ' ' + $.className('icon') + ' ' + $.className('icon-pulldown');
	var CLASS_PULL_TOP_ARROW_REVERSE = CLASS_PULL_TOP_ARROW + ' ' + $.className('reverse');
	var CLASS_PULL_TOP_SPINNER = $.className('pull-loading') + ' ' + $.className('spinner');
	var CLASS_SCROLL = $.className('scroll');
	
	var CLASS_PULL_INITTITLE="下拉刷新";
	var CLASS_PULL_DOWNTITLE = "松开刷新";
	var CLASS_PULL_REFRESHTITLE = "正在刷新";
	var CLASS_PULL_TOP_REFSH = $.className('pull-loading') + ' ' + $.className('icon') + ' ' + $.className('spinner');
	
	$.PullToRefresh = $.PullToRefresh.extend({
		init: function(element, options) {
			this._super(element, options);
			this.options = $.extend(true, {
				down: {
					height: 25,
				}
			}, this.options);
			this.options.down.contentinit = this.options.down.contentinit?this.options.down.contentinit:CLASS_PULL_INITTITLE;
			this.options.down.contentdown = this.options.down.contentdown?this.options.down.contentdown:CLASS_PULL_DOWNTITLE;
			this.options.down.contentrefresh = this.options.down.contentrefresh?this.options.down.contentrefresh:CLASS_PULL_REFRESHTITLE;
			this.isInScroll = this.element.classList.contains(CLASS_SCROLL);
		},
		initPullDownTips: function() {
			var self = this;
			if ($.isFunction(self.options.down.callback)) {
				self.pullDownTips = (function() {
					var element = document.querySelector('.' + CLASS_PULL_TOP_TIPS);
					if (element) {
						element.parentNode.removeChild(element);
					}
					if (!element) {
						element = document.createElement('div');
						element.classList.add(CLASS_PULL_TOP_TIPS,CLASS_BLOCK);
						element.innerHTML = '<div class="mui-pull"><div class="mui-pull-loading mui-icon mui-icon-pulldown"></div><div class="mui-pull-caption"></div></div>';
//						self.element.addEventListener('webkitTransitionEnd', self);//监听页面动画完成事件 
					}
					self.pullDownTipsIcon = element.querySelector(SELECTOR_PULL_LOADING);//取得图标dom
					self.pullDownTipsContent = element.querySelector(SELECTOR_PULL_CONTENT);//取得内容dom
					self.pullDownTipsContent.innerHTML = self.options.down.contentinit;
					self.element.parentNode.insertBefore(element,self.element);
					return element;
				}());
			}
		},
		_drag: function(e) {
			if (this.loading || this.stopped) {
				e.stopPropagation();
				e.detail.gesture.preventDefault();
				return;
			}
			
			var detail = e.detail;
			if (!this.isDragging) {
				if (detail.direction === 'down' && this._canPullDown()) {
					if (document.querySelector('.' + CLASS_PULL_TOP_TIPS)) {
						e.stopPropagation();
						e.detail.gesture.preventDefault();
						return;
					}
					this.isDragging = true;
					this.removing = false;
					this.startDeltaY = detail.deltaY;
					$.gestures.session.lockDirection = true; //锁定方向
					$.gestures.session.startDirection = detail.direction;
					this._pullStart(this.startDeltaY);
				}
			}
			if (this.isDragging) {
				e.stopPropagation();
				e.detail.gesture.preventDefault();
				var deltaY = detail.deltaY - this.startDeltaY;
				deltaY = Math.min(deltaY, 1.5 * this.options.down.height);
				this.deltaY = deltaY;
				this._pulling(deltaY);
				var state = deltaY > this.options.down.height ? STATE_AFTERCHANGEOFFSET : STATE_BEFORECHANGEOFFSET;
				if (this.state !== state) {
					this.state = state;
					if (this.state === STATE_AFTERCHANGEOFFSET) {
						this.removing = false;
						this.isNeedRefresh = true;
					} else {
						this.removing = true;
						this.isNeedRefresh = false;
					}
					this['_' + state](deltaY);
				}
				if ($.os.ios && parseFloat($.os.version) >= 8) {
					var clientY = detail.gesture.touches[0].clientY;
					if ((clientY + 10) > window.innerHeight || clientY < 10) {
						this._dragend(e);
						return;
					}
				}
			}
		},
		_transitionEnd: function(e) {
			if (this.removing) {
				this.removePullDownTips();
			}
		},
		removePullDownTips: function() {//结束动画后隐藏提示
			this._super();
			this.pullDownTipsIcon.className = CLASS_PULL_TOP_ARROW;
			this.pullDownTipsContent.innerHTML = this.options.down.contentinit;
		},
		pullStart: function(startDeltaY) {
			this.initPullDownTips(startDeltaY);
			this.pullDownTips.classList.add(CLASS_SHOW);//显示提示
		},
		pulling: function(deltaY) {
			this.element.style.webkitTransform = 'translate3d(0,' + (deltaY < 0 ? 0 : deltaY) + 'px,0)';
		},

		beforeChangeOffset: function(deltaY) {//下拉可刷新状态
			this.pullDownTipsIcon.className = CLASS_PULL_TOP_ARROW;
			this.pullDownTipsContent.innerHTML = this.options.down.contentinit;
			this.pullDownTipsIcon.style.transition = "-webkit-transform 0.3s ease-in;"
			this.pullDownTipsIcon.style.webkitTransform = "rotate(0deg)";
			this.pullDownTips.classList.add(CLASS_SHOW);
		},
		afterChangeOffset: function(deltaY) {//松开可刷新状态
			//设置箭头方向
			this.pullDownTipsIcon.style.transition = "-webkit-transform 0.3s ease-in;"
			this.pullDownTipsIcon.style.webkitTransform = "rotate(180deg)";
			this.pullDownTipsContent.innerHTML = this.options.down.contentdown;
		},
		dragEndAfterChangeOffset: function(isNeedRefresh) {//正在刷新状态
			if (isNeedRefresh) {
				this.pullDownLoading();
			} else {
				this.endPullDownToRefresh();
			}
		}
		,pullDownLoading: function() {
			this.pullDownTipsIcon.className = CLASS_PULL_TOP_REFSH;
			this.pullDownTipsContent.innerHTML = this.options.down.contentrefresh;
			if (this.loading) {
				return;
			}
			if (!this.pullDownTips) {
				this.initPullDownTips();
				this.dragEndAfterChangeOffset(true);
				return;
			}
			this.loading = true;
			this.options.down.callback.apply(this);
		},
		endPullDownToRefresh: function() {
			this.loading = false;
			this.element.style.webkitTransform = 'translate3d(0,0,0)';//将拖动页面回弹动画
			if (this.deltaY <= 0) {
				this.removePullDownTips();
			} else {
				this.removing = true;
			}
			this._transitionEnd();//执行事件结束事件
			if (this.isInScroll) {
				$(this.element.parentNode).scroll().refresh();//初始化滚动
			}
		},
		//操他大爷的，官方的滚动到顶部写的乱七八糟，还不如老子自己写了一个
		scrollTo:function(x,y,times){
			times = times?times:100;
			$(this.element.parentNode).scroll().scrollTo(x,y,times);
		},
		//操他大爷的，官方的滚动到顶部写的乱七八糟，还不如老子自己写了一个
		scrollTop:function(times){
			times = times?times:100;
			$(this.element.parentNode).scroll().scrollTo(0,0,times);
		},
	});
})(mui);