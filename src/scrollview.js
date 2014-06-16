(function (window) {

    var easingFn = {
        quadratic: {
            transition: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        },
        circular: {
            transition: 'cubic-bezier(0.1, 0.57, 0.1, 1)'
        },
        back: {
            transition: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        },
        bounce: {
            transition: 'cubic-bezier(0.5, -0.5, 0.5, 1.5)'
        },
        elastic: {

        }
    };

    // private functions
    var handleStart = function (ev) {

        if (!this.enabled ||
            this.isScrolling) { // already scrolling by another pointer
            return;
        }

        this.isScrolling = ev.pointerId; // lock for pointer
        this.hasMoved = false; // if scrolling has started

        this.startTime = new Date().getTime();
        this.pointX = ev.pageX;
        this.pointY = ev.pageY;

        // bind events
        document.addEventListener('pointerup', this._handleEnd, false);
        document.addEventListener('pointercancel', this._handleEnd, false);
        document.addEventListener('pointermove', this._handleMove, false);
    };

    var handleMove = function (ev) {
        if (!this.enabled ||
            this.isScrolling !== ev.pointerId) {
            return;
        }

        var deltaX = ev.pageX - this.pointX,
            deltaY = ev.pageY - this.pointY,
            timestamp = new Date().getTime(),
            newX, newY;

        this.pointX = ev.pageX;
        this.pointY = ev.pageY;

        newX = this.options.scrollX ? this.x + deltaX : this.x;
        newY = this.options.scrollY ? this.y + deltaY : this.y;

        // TODO add WIGGLE_THRESHOLD


        if (!this.hasMoved) {
            // TRIGGER: scrollstart
            this.hasMoved = true;
        }

        this.scrollTo(newX, newY);

        // TRIGGER scroll
        // calc scroll direction +-x and +-y
    };

    var handleEnd = function (ev) {
        if (!this.enabled ||
            this.isScrolling !== ev.pointerId) {
            return;
        }

        document.removeEventListener('pointerup', this._handleEnd, false);
        document.removeEventListener('pointercancel', this._handleEnd, false);
        document.removeEventListener('pointermove', this._handleMove, false);

        // reset state (wait for transition end)
        this.isScrolling = null;

        // wait with eventing for transition
        if (ev.type === 'pointercancel') {
            // TRIGGER: scrollcancel
        }
        // TRIGGER: scrollend
    };

    function ScrollView (el, options) {
        var opt = options || {};

        this.view = typeof el === 'string' ? document.querySelector(el) : el;
        this.scroller = this.view.children[0];

        this.options = {
            startX: 0,
            startY: 0,

            scrollX: false,
            scrollY: true,

            momentum: true,

            bounce: true,
            bounceTime: 600,
            bounceEasing: '',

            preventDefault: true
        };

        // define initial state
        this.enabled = true;
        this.isScrolling = false;

        // event handler
        this._handleStart = handleStart.bind(this);
        this._handleMove = handleMove.bind(this);
        this._handleEnd = handleEnd.bind(this);

        this.view.addEventListener('pointerdown', this._handleStart, false);

        // inital scroll
        this.scrollTo(this.options.startX, this.options.startY);
    }

    ScrollView.prototype = {
        version: '0.0.0',

        enable: function (cond) {
            this.enabled = cond === false ? cond : true;
        },

        destroy: function () {

        },

        refresh: function () {

        },

        cancel: function (pointerId) {

        },

        scrollTo: function (x, y, time, easing) {
            var ease = easing || easingFn.circular,
                transform = 'translate(' + x + 'px,' + y + 'px)',
                translateZ = ' translateZ(0)';

            this.x = x;
            this.y = y;

            this.scroller.style['transitionTimingFunction'] =
            this.scroller.style['webkitTransitionTimingFunction'] = ease.transition;
            this.scroller.style['transitionDuration'] =
            this.scroller.style['webkitTransitionDuration'] = (time || 0) + 'ms';
            this.scroller.style['transform'] =
            this.scroller.style['webkitTransform'] = transform + translateZ;
        }
    };

    window.ScrollView = ScrollView;

}(this));
