'use strict';

module.exports = function(grunt) {

    // grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-nodemon');
    // grunt.loadNpmTasks('grunt-bower');
    // grunt.loadNpmTasks('grunt-bower-install-simple');

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        'bower-install-simple': {
            options: {
                color: true,
                directory: 'lib'
            },
            prod: {
                options: {
                    production: true
                }
            },
            dev: {
                options: {
                    production: false
                }
            }
        },
        // bower: {
        //     dev: {
        //         dest: 'html/vendor',
        //         js_dest: 'html/js/vendor',
        //         css_dest: 'html/css/vendor',
        //         fonts_dest: 'html/fonts/vendor',
        //         options: {
        //             expand: false,
        //             keepExpandedHierarchy: false
        //         },
        //     }
        // },
        eslint: {
            target: ['Gruntfile.js', 'server.js', 'lib/*.js', 'test/*.js'],
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
            // build: ['build', 'html/js/client.js'],
        },
    });

    // Default task(s).
    grunt.registerTask('default', ['eslint', 'mochaTest']);
};
