(function () {
    'use strict';

    // Declare app level module which depends on filters, and services
    var app = angular.module('app', [
        'ui.router',
        'ui.bootstrap',
        'app.authentication',
        'app.filters',
        'app.services',
        'app.directives',
        'app.controllers'
    ]);

    app.constant('backendURL', 'api');

    // set up the authentication Service
    app.config(['authServiceProvider', 'backendURL',
        function(authProvider, backendURL) {
            authProvider
                .role('public', 'user', 'admin')
                .defaultRole('public')
                .accessLevel('public', '*')
                .accessLevel('anon', ['public'])
                .accessLevel('user', ['user', 'admin'])
                .accessLevel('admin', ['admin'])
                .loginURL(backendURL + '/login');
        }
    ]);

    // set the routes
    app.config(['$stateProvider', '$urlRouterProvider',
        function($stateProvider, $urlRouterProvider) {
            // public routes
            $stateProvider
                .state('public', {
                    abstract: true,
                    template: '<ui-view/>',
                    data: {
                        access: 'public'
                    }
                })
                .state('public.view1', {
                    url: "/view1",
                    templateUrl: "partials/partial1.html",
                    controller: "MyCtrl1",
                });

            // anonymous routes
            $stateProvider
                .state('anon', {
                    abstract: true,
                    template: '<ui-view/>',
                    data: {
                        access: 'public'
                    }
                })
                .state('anon.login', {
                    url: "/login",
                    templateUrl: "partials/login.html",
                    controller: "LoginCtrl",
                    data: {
                        access: 'anon'
                    }
                });

            // user routes
            $stateProvider
                .state('user', {
                    abstract: true,
                    template: '<ui-view/>',
                    data: {
                        access: 'user'
                    }
                })
                .state('user.view2', {
                    url: "/view2",
                    templateUrl: "partials/partial2.html",
                    controller: "MyCtrl2",
                })
                .state('user.logout', {
                    url: "/logout",
                    template: "<p>logout</p>",
                    controller: "LogoutCtrl",
                })
        }
    ]);
})();
