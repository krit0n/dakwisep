(function() {
    'use strict';

    /* Module for client-side authentication */
    var authentication = angular.module('app.authentication', ['ui.router']);

    authentication.provider('authService', function() {
        var roles = {}, // { role: {'name': role, 'bitmask': [int]}, ... }
            defaultRole = {},
            accessLevels = {}, // { accessLevel: {'bitmask': [int]}, ... }
            loginURL = '';

        /**
         * Adds a user role.
         * @param {...string} role - Name of the role
         */
        this.role = function() {
            for (var i = 0; i < arguments.length; i++) {
                var r = arguments[i]; // name of role to add
                roles[r] = {
                    'name': r,
                    'bitmask': Math.pow(2, Object.keys(roles).length)
                };
            }
            return this;
        };

        /**
         * Sets the default role
         * @param {string} r Name of the role
         */
        this.defaultRole = function(r) {
            if (!roles.hasOwnProperty(r)) {
                throw new Error("Default Role is not contained in available roles");
            }
            defaultRole = roles[r] || {};
            return this;
        };

        /**
         * Adds an access level.
         * @param {string} name - Name of the access level
         * @param {string[]|'*'} validRoles - The roles, that can authenticate for this
         *   access level. '*' stands for access to all roles.
         */
        this.accessLevel = function(name, validRoles) {
            if (validRoles === '*') { // '*' accesses all roles
                validRoles = Object.keys(roles);
            }

            var bitmask = 0;
            for (var i = 0; i < validRoles.length; i++) {
                var acrole = validRoles[i]; // valid role for access level

                if (!roles.hasOwnProperty(acrole)) {
                    throw new Error("Roles of the access level are not contained in available roles");
                }
                bitmask += roles[acrole].bitmask;
            }

            accessLevels[name] = {
                'bitmask': bitmask
            };
            return this;
        };

        /**
         * Sets the URL to log into the backend.
         * @param {string} name - Backend URL
         */
        this.loginURL = function(url) {
            loginURL = url;
            return this;
        };

        /**
         * Constructor for the auth service.
         */
        function Authentication($rootScope, $http, $q) {
            var currentRole = defaultRole,
                token = false;

            /**
             * Authorizes a role for an access level
             * @param {string} accessLevel The access level to authorize for
             * @param {string} role (optional) The role that authorizes fo the access level.
             *   If role is undefined, the current role will be used.
             * @return true if role authorizes for access level
             */
            this.authorize = function(accessLevel, role) {
                var rbitmask;
                // can't authorize for nonexistent access level
                if (!accessLevels.hasOwnProperty(accessLevel)) {
                    return false;
                }
                if (role === undefined) { // use current Role
                    rbitmask = currentRole.bitmask || 0;
                } else { // nonexistent role has no access
                    rbitmask = (roles.hasOwnProperty(role)) ? roles[role].bitmask : 0;
                }

                return !!(accessLevels[accessLevel].bitmask & rbitmask);
            };

            /**
             * Sends authentication data to the backend and sets a token
             * in the X-AUTH-TOKEN header and a role on success.
             * If logging in was successfull the event auth.loggedIn is broadcasted.
             * @param {Object} logindata Data to get authenticated by the backend
             * @return A promise object, that gets resolved on successfull
             *   authorization
             */
            this.login = function(loginData) {
                var deferred = $q.defer();
                $http.post(loginURL, loginData)
                    .success(function(response) {
                        if (response.success === true) { // login was successfull
                            clientSideLogin(response.role, response.token);
                            deferred.resolve();
                        } else {
                            deferred.reject();
                        }
                    })
                    .error(function() {
                        deferred.reject();
                    });
                return deferred.promise;
            };

            /**
             * Resets the current role to the default role and
             * removes the X-AUTH-TOKEN header
             * If logging out was successfull the event auth.loggedOut is broadcasted.
             */
            this.logout = function() {
                clientSideLogout();
                return $q.defer().resolve();
            };

            /**
             * @return true if a token is currently set
             */
            this.isLoggedIn = function() {
                return (token !== false);
            };

            /**
             * @return The name of the current role.
             *   false if the is no current role.
             */
            this.getRole = function() {
                return currentRole.name || false;
            };

            /**
             * Sets a new role. If role is not defined, default
             * role will be used.
             * @param {string} r Name of role
             * @return true on success, false otherwise
             */
            this.setRole = function(r) {
                return changeRole(r);
            };

            /**
             * @return array of all available roles
             */
            this.getAllRoles = function() {
                return Object.keys(roles);
            };

            /**
             * @return the current token
             */
            this.getToken = function() {
                return token;
            };

            /**
             * Logs the user in on the client side.
             * A new authentication token and a role will be set.
             * Additionally the event auth.loggedIn is broadcasted.
             * @param {string} newRole the new role
             * @param {string} newToken the new token
             */
            function clientSideLogin(newRole, newToken) {
                if (newToken) {
                    token = newToken;
                    $http.defaults.headers.common['X-AUTH-TOKEN'] = token;
                }
                if (newRole) {
                    changeRole(newRole);
                }
                $rootScope.$broadcast('auth.loggedIn');
            }

            /**
             * Logs the user out on the client side.
             * Role will be set to the default role,
             * and the authentication token will be deleted.
             * Additionally the event auth.loggedOut is broadcasted.
             */
            function clientSideLogout() {
                changeRole(defaultRole.name);
                token = false;
                delete $http.defaults.headers.common["X-AUTH-TOKEN"];

                $rootScope.$broadcast('auth.loggedOut');
            }

            /**
             * Changes the current role.
             * @param {string} role The new role
             * @return true, if the role has changed, false otherwise
             */
            function changeRole(role) {
                var newRole = roles[role] || defaultRole;
                if (newRole !== currentRole) {
                    currentRole = newRole;
                    $rootScope.$broadcast('auth.roleChange', newRole.name);
                    return true;
                }
                return false;
            }
        }

        this.$get = ['$rootScope', '$http', '$q',
            function($rootScope, $http, $q) {
                return new Authentication($rootScope, $http, $q);
            }
        ];
    });

    authentication.directive('accessLevel', ['authService',
        function(auth) {
            return {
                restrict: 'A',
                link: function($scope, element, attrs) {
                    var originalDisplayMode = element.css('display'),
                        accessLevel;

                    function displayElement(disp) {
                        element.css('display', disp ? originalDisplayMode : 'none');
                    }

                    attrs.$observe('accessLevel', function(acLvl) {
                        accessLevel = acLvl;
                        displayElement(auth.authorize(accessLevel));
                    });

                    $scope.$on('auth.roleChange', function(event, newRole) {
                        displayElement(auth.authorize(accessLevel));
                    });
                }
            }
        }
    ]);

    authentication.config(['$httpProvider', function($httpProvider) {
	$httpProvider.interceptors.push(['$q', function($q) {
	    return {
		'responseError': function(response) {
		    if (response.status === 401) { // forbidden
			$rootScope.$broadcast('auth.accessToResourceForbidden');
		    } else if (response.status === 403) { // unauthorized
			$rootScope.$broadcast('auth.accessToResourceUnauthorized');
		    }
		    return $q.reject(response);
		}
	    }
	}]);
    }]);

    authentication.run(['$rootScope', 'authService',
        function($rootScope, authService) {
            // prevent a state change if role gets no authentication for access level
            // in toState.data.access and broadcast auth.accessToStateDenied if state
            // change gets prevented
            $rootScope.$on('$stateChangeStart',
                function(event, toState, toParams, fromState, fromParams) {
                    if (!authService.authorize(toState.data.access)) {
                        event.preventDefault(); // prevents state change
                        $rootScope.$broadcast('auth.accessToStateDenied',
                            toState, toParams, fromState, fromParams);
                    }
                });
        }
    ]);
})();
