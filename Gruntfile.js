'use strict';

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-bower');

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        bower: {
            prod: {
                dest:        'html/vendor',
                images_dest: 'html/vendor/img',
                js_dest:     'html/vendor/js',
                css_dest:    'html/vendor/css',
                fonts_dest:  'html/vendor/fonts',

                options: {
                    expand: false,
                    keepExpandedHierarchy: false,
                    packageSpecific: {
                        bootstrap: {
                            files: [
                                'dist/css/bootstrap.min.css',
                                'dist/js/bootstrap.min.j'
                            ]
                        },
                        jquery: {
                            files: [
                                'dist/jquery.min.js'
                            ]
                        },
                        'html5-boilerplate': {
                            files: [
                                '404.html',
                                'apple-touch-icon.png',
                                'crossdomain.xml',
                                'browserconfig.xml',
                                'favicon.ico',
                                'robots.txt'
                            ]
                        },
                        fontawesome: {
                            files: [
                                'css/font-awesome.min.css',
                                'fonts/FontAwesome.otf',
                                'fonts/fontawesome-webfont.svg',
                                'fonts/fontawesome-webfont.woff',
                                'fonts/fontawesome-webfont.eot',
                                'fonts/fontawesome-webfont.ttf',
                                'fonts/fontawesome-webfont.woff2'
                            ]
                        }
                    }
                },
            }
        },
        eslint: {
            target: ['server.js', 'lib/*.js', 'test/*.js'],
        },
        mochaTest: {
            options: {
            },
            any: {
                src: ['test/*.js']
            }
        },
        nodemon: {
            dev: {
                script: 'server.js',
                options: {
                    env: {
                        NODE_ENV: 'test'
                    },
                    callback: function(nodemon) {
                        nodemon.on('log', function(event) {
                            console.log(event.colour);
                        });

                        // opens browser on initial server start
                        nodemon.on('config:update', function() {
                            // Delay before server listens on port
                            setTimeout(function() {
                                require('open')('http://localhost:8000/');
                            }, 1000);
                        });
                    }
                }
            }
        },
        watch: {
            files: ['<%= eslint.target %>'],
            tasks: ['eslint', 'mochaTest']
        },
        clean: {
            build: ['build', 'html/js/client.js'],
        },
    });

    // Default task(s).
    grunt.registerTask('lint', ['eslint']);
    grunt.registerTask('default', ['eslint', 'mochaTest']);
};
