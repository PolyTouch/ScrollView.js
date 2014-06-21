module.exports = function(grunt) {

    var pkg = require('./package.json'),
        buildTime =  new Date().toISOString();

    grunt.initConfig({
        replace: {
            build: {
                files: [{
                    src: ['src/scrollview.js'],
                    dest: 'scrollview.js'
                }],
                options: {
                    patterns: [{
                        json: {
                            version: pkg.version,
                            date: buildTime,
                            author: pkg.author
                        }
                    }]
                }
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            all: ['scrollview.js']
        },
        uglify: {
            min: {
                options: {
                    preserveComments: 'some'
                },
                files : {
                    'scrollview.min.js' : ['scrollview.js']
                }
            }
        },
        yuidoc : {
            compile: {
                name: pkg.name,
                description: pkg.description,
                version: pkg.version,
                url: pkg.homepage,
                options: {
                    paths: 'src/',
                    outdir: 'docs/'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-replace');
    grunt.loadNpmTasks('grunt-contrib-yuidoc');

    grunt.registerTask('default', ['replace', 'jshint', 'uglify', 'yuidoc']);
};
