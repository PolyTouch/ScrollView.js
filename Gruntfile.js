module.exports = function(grunt) {

    var pkg = require('./package.json'),
        buildTime =  new Date();

    grunt.initConfig({
        outputName: 'scrollview',
        replace: {
            build: {
                files: [{
                    src: ['src/scrollview.js'],
                    dest: '<%= outputName %>.js'
                }],
                options: {
                    patterns: [{
                        json: pkg
                    }, {
                        json: {
                            date: buildTime.toISOString(),
                            year: buildTime.getFullYear()
                        }
                    }]
                }
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: ['<%= outputName %>.js']
        },
        uglify: {
            min: {
                options: {
                    preserveComments: 'some'
                },
                files : {
                    '<%= outputName %>.min.js' : ['<%= outputName %>.js']
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
                    ignorePaths: ['src/', 'example', 'docs', 'node_modules'],
                    paths: '.',
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
