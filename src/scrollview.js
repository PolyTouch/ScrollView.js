(function (window) {

    var defaults = {
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

    function ScrollView (el, opt) {
        this.wrapper = typeof el == 'string' ? document.querySelector(el) : el;
        this.scroller = this.wrapper.children[0];
    }

    var start = function () {

    };

    var move = function () {

    };

    var end = function () {

    };

    ScrollView.prototype = {
        version: '0.0.0',

        enable: function (cond) {

        },

        destroy: function () {

        },

        refresh: function () {

        },

        cancel: function (pointerId) {

        }
    }


}(this));
