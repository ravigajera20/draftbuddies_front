angular.module('dbuddies.controllers', [])

    .controller('masterCtrl', function ($rootScope, $scope, $wamp, $http, $ocLazyLoad, $state, $cookies, $window, ModalService) {

        $rootScope.apiUrl = 'http://api.draftbuddies.com/api/';
        $rootScope.wampParams = {
            "filterBySlug": [],
            "filterByVendor": [],
            "filterByCategory": [],
            "filterByTag": [],
            "expectedFields": 67108863,
            "expectedFormat": "map",
            "pageIndex": 1,
            "pageSize": 2,
            "sortFields": []
        };
        $rootScope.currencies = [];
        $rootScope.countries = [];
        $rootScope.selectedPaymentMethod = '';

        $rootScope.capitalize = function (string) {
            return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
        }

        $rootScope.getPrefixByCountry = function (country){
            var field = {};
            $scope.countries.some(function(itm){
                if(itm.code === country){
                    field = itm;
                    return true;
                }
            });
            return field;
        }

        $rootScope.ordinal_suffix_of = function(i) {
            var j = i % 10,
                k = i % 100;
            if (j == 1 && k != 11) {
                return i + "st";
            }
            if (j == 2 && k != 12) {
                return i + "nd";
            }
            if (j == 3 && k != 13) {
                return i + "rd";
            }
            return i + "th";
        }

        $wamp.call('/user/basicConfig#get', [], $rootScope.wampParams)
            .then(function (response) {
                $ocLazyLoad.load(response.kwargs.iovation.javaScriptUrl);
            })

        $wamp.call(
            '/user/account#getCurrencies',
            []
        ).then(function (response) {
            $rootScope.currencies = response.kwargs;
        })

        $wamp.call(
            '/user/account#getCountries',
            [],
            {
                expectRegions: true
            }
        ).then(function (response) {
            $rootScope.countries = response.kwargs.countries;
        })

        $wamp.call(
            '/user#setClientIdentity',
            [],
            {
                groupID: (localStorage.getItem('groupID') ? localStorage.getItem('groupID') : '')
            }
        ).then(function (response) {
            localStorage.setItem('groupID', response.kwargs.groupID);

            $wamp.call(
                '/user#getSessionInfo',
                [],
                {
                    iovationBlackBox: $rootScope.ioBlackBox
                }
            ).then(function (response) {
                $rootScope.userdata.username = response.kwargs.username;

                $wamp.call(
                    '/user/account#getGamingAccounts',
                    [],
                    {
                        iovationBlackBox: $rootScope.ioBlackBox,
                        expectBalance: true
                    }
                ).then(function (response) {
                    $rootScope.userdata.userbalance = response.kwargs.accounts[0].amount.toString() + ' ' + response.kwargs.accounts[0].currency;
                    $rootScope.loggedin = true;
                }, function (error) {

                })
            })

        })

        $rootScope.loggedin = false;
        $rootScope.ioBlackBox = '';
        $rootScope.selectedContest = {};

        $rootScope.userdata = {
        }

        if(localStorage.getItem('user_token') !== null && localStorage.getItem('user_token') !== null && localStorage.getItem('user_token') !== null)
            $rootScope.loggedin = true;
        if(sessionStorage.getItem('user_token') !== null && sessionStorage.getItem('user_token') !== null && sessionStorage.getItem('user_token') !== null)
            $rootScope.loggedin = true;

        $rootScope.logout = function () {
            $wamp.call(
                '/user#logout',
                [],
                {
                    iovationBlackBox: $rootScope.ioBlackBox
                }
            )
            localStorage.removeItem('user_token');
            localStorage.removeItem('token_type');
            localStorage.removeItem('refresh_token');
            sessionStorage.removeItem('user_token');
            sessionStorage.removeItem('token_type');
            sessionStorage.removeItem('refresh_token');
            $cookies.remove('wampConnection');
            $rootScope.loggedin = false;
            $state.go('master.home');
            window.location.reload();
        }

        $rootScope.getContestInfo = function (id) {

            ModalService.showModal({
                templateUrl: 'modals/contestinfo.html',
                controller: function ($scope, $http, $element, contestid, close) {
                    $scope.cancel = function() {
                        $element.modal('hide');
                        close({
                            name: $scope.name,
                            age: $scope.age
                        }, 500);
                    }
                    $scope.infotab = 'info';
                    $scope.contest = {};

                    $http({
                        method: 'GET',
                        url: $rootScope.apiUrl + 'contest/' + contestid,
                        headers: {
                            'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                        }
                    }).then(function (response) {
                        console.log(response.data.data);
                        $scope.contest = response.data.data;
                    }, function (error) {
                    })

                },
                inputs: {
                    contestid: id
                }
            }).then(function (modal) {
                modal.element.modal();
                modal.close.then(function () {

                })
            })

        }

        $rootScope.removeFriend = function (id, request) {

            if(!request)
                var confirm = $window.confirm('Are you sure you want to unfriend this user?');
            else
                var confirm = $window.confirm('Are you sure you want to ignore this request?');

            if(confirm) {
                $http({
                    method: 'POST',
                    url: $rootScope.apiUrl + 'user/friend-request/remove',
                    headers: {
                        'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                    },
                    params: {
                        friend_id: id
                    }
                }).then(function (response) {
                    if(response.data.status == 'success') {
                        alert('Removed from friends successfully!');
                    }
                    else {
                        alert('Something went wrong! Please try again.');
                    }
                    $http({
                        method: 'GET',
                        url: $rootScope.apiUrl + 'user/friends',
                        headers: {
                            'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                        }
                    }).then(function (response) {
                        $scope.friends = response.data.data;
                    }, function (error) {

                    })
                }, function (error) {
                    alert('Could not remove friend! Please try again.');
                })
            }

            if(!request) {

            }
            else {

            }
        }

    })
    .controller('sub_memberCtrl', function ($rootScope, $scope, $http, $wamp, ModalService) {

        $rootScope.currentpage = 'home';

        $scope.opensearch = function () {

            ModalService.showModal({
                templateUrl: 'modals/searchusers.html',
                controller: function ($scope, $http, $state, $element, close) {
                    $scope.cancel = function() {
                        $element.modal('hide');
                        close({
                            name: $scope.name,
                            age: $scope.age
                        }, 500); // close, but give 500ms for bootstrap to animate
                    }
                    $scope.users = [];
                    $scope.keyword = '';
                    
                    $scope.$watch(function () {
                        return $scope.keyword;
                    }, function (newVal, oldVal) {
                        if(newVal != '') {
                            $http({
                                method: 'GET',
                                url: $rootScope.apiUrl + 'users',
                                headers: {
                                    'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                                },
                                params: {
                                    keyword: newVal
                                }
                            }).then(function (response) {
                                $scope.users = response.data.data;
                            }, function (error) {
                            })
                        }
                    })

                    $scope.sendFriendRequest = function (id) {
                        $http({
                            method: 'POST',
                            url: $rootScope.apiUrl + 'user/friend-request',
                            headers: {
                                'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                            },
                            params: {
                                friend_id: id
                            }
                        }).then(function (response) {
                            if(response.data.status == 'success') {
                                alert('Friend request sent successfully!');
                            }
                            else {
                                alert('Something went wrong! Please try again.');
                            }
                            $http({
                                method: 'GET',
                                url: $rootScope.apiUrl + 'users',
                                headers: {
                                    'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                                },
                                params: {
                                    keyword: $scope.keyword
                                }
                            }).then(function (response) {
                                $scope.users = response.data.data;
                            }, function (error) {
                            })
                        }, function (error) {
                            alert('Could not sent friend request! Please try again.');
                        })
                    }

                    $scope.acceptFriendRequest = function (id) {
                        $http({
                            method: 'POST',
                            url: $rootScope.apiUrl + 'user/friend-request/accept',
                            headers: {
                                'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                            },
                            params: {
                                request_id: id
                            }
                        }).then(function (response) {
                            if(response.data.status == 'success') {
                                alert('Friend request accepted successfully!');
                            }
                            else {
                                alert('Something went wrong! Please try again.');
                            }
                            $http({
                                method: 'GET',
                                url: $rootScope.apiUrl + 'users',
                                headers: {
                                    'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                                },
                                params: {
                                    keyword: newVal
                                }
                            }).then(function (response) {
                                $scope.users = response.data.data;
                            }, function (error) {
                            })
                        }, function (error) {
                            alert('Could not accept friend request! Please try again.');
                        })
                    }
                }
            }).then(function (modal) {
                modal.element.modal();
                modal.close.then(function (result) {

                })
            })

        }

        $scope.showFriends = function () {

            ModalService.showModal({
                templateUrl: 'modals/friends.html',
                controller: function ($scope, $http, $state, $element, close) {
                    $scope.cancel = function() {
                        $element.modal('hide');
                        close({
                        }, 500);
                    }
                    $scope.friends = [];
                    $scope.keyword = '';

                    $http({
                        method: 'GET',
                        url: $rootScope.apiUrl + 'user/friends',
                        headers: {
                            'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                        }
                    }).then(function (response) {
                        $scope.friends = response.data.data;
                    }, function (error) {

                    })
                }
            }).then(function (modal) {
                modal.element.modal();
                modal.close.then(function (result) {

                })
            })

        }

        $scope.seeFriendRequests = function () {

            ModalService.showModal({
                templateUrl: 'modals/viewrequests.html',
                controller: function ($scope, $http, $state, $element, close) {
                    $scope.cancel = function() {
                        $element.modal('hide');
                        close({
                            name: $scope.name,
                            age: $scope.age
                        }, 500); // close, but give 500ms for bootstrap to animate
                    }
                    $scope.requests = [];
                    $scope.keyword = '';

                    $http({
                        method: 'GET',
                        url: $rootScope.apiUrl + 'user/friend-request',
                        headers: {
                            'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                        }
                    }).then(function (response) {
                        $scope.requests = response.data.data;
                    }, function (error) {
                    })

                    $scope.acceptFriendRequest = function (id) {
                        $http({
                            method: 'POST',
                            url: $rootScope.apiUrl + 'user/friend-request/accept',
                            headers: {
                                'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                            },
                            params: {
                                request_id: id
                            }
                        }).then(function (response) {
                            if(response.data.status == 'success') {
                                alert('Friend request accepted successfully!');
                            }
                            else {
                                alert('Something went wrong! Please try again.');
                            }
                            $http({
                                method: 'GET',
                                url: $rootScope.apiUrl + 'user/friend-request',
                                headers: {
                                    'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                                }
                            }).then(function (response) {
                                $scope.requests = response.data.data;
                            }, function (error) {
                            })
                        }, function (error) {
                            alert('Could not accept friend request! Please try again.');
                        })
                    }
                }
            }).then(function (modal) {
                modal.element.modal();
                modal.close.then(function (result) {

                })
            })

        }

    })
    .controller('sub_guestCtrl', function ($rootScope, $scope, $http, $state, $wamp) {

        $scope.logincreds = {

        };

        $scope.signupcreds = {

        };

        $scope.changetimezone = function () {
            
        }

        $scope.checkusername = function () {
            
        }

        $scope.passwordregex = '/(?=.*\d+)(?=.*[A-Za-z]+).{8,20}/';
        $scope.passwordrequirement = '';

        $wamp.call(
            '/user/pwd#getPolicy',
            []
        ).then(function (response) {
            $scope.passwordregex = response.kwargs.regularExpression;
            $scope.passwordrequirement = response.kwargs.message;
        })

        $scope.setmobileprefix = function (value) {
            $scope.signupcreds.mobileprefix = $rootScope.getPrefixByCountry($scope.signupcreds.country).phonePrefix;
        }

        $scope.gologin = function () {

            if($scope.logincreds.usernameOrEmail == null || $scope.logincreds.usernameOrEmail == '') {
                return alert('Please enter your username or email to login!');
            }

            if($scope.logincreds.password == null || $scope.logincreds.password == '') {
                return alert('Please enter your password to login!');
            }

            // $http.post($rootScope.apiUrl + 'login/web', $scope.logincreds)
            //     .then(function (response) {
            //         if(response.status == 200) {
            //
            //             if(response.data.status == 'error') {
            //                 alert('Invalid login credentials! Please try again.');
            //                 return;
            //             }
            //
            //             if($scope.logincreds.rememberme) {
            //                 localStorage.setItem('user_token', response.data.token);
            //                 localStorage.setItem('token_type', response.data.Bearer);
            //                 localStorage.setItem('refresh_token', response.data.refresh_token);
            //
            //                 $rootScope.userdata = {
            //                     user_token: response.data.token,
            //                     token_type: response.data.Bearer,
            //                     refresh_token: response.data.refresh_token
            //                 }
            //
            //                 $wamp.call(
            //                     '/user#getSessionInfo',
            //                     [],
            //                     {
            //                         iovationBlackBox: $rootScope.ioBlackBox
            //                     }
            //                 ).then(function (response) {
            //                     $rootScope.userdata.username = response.kwargs.username;
            //                 })
            //
            //             }
            //             else {
            //                 sessionStorage.setItem('user_token', response.data.token);
            //                 sessionStorage.setItem('token_type', response.data.Bearer);
            //                 sessionStorage.setItem('refresh_token', response.data.refresh_token);
            //
            //                 $rootScope.userdata = {
            //                     user_token: response.data.token,
            //                     token_type: response.data.Bearer,
            //                     refresh_token: response.data.refresh_token
            //                 }
            //
            //                 $wamp.call(
            //                     '/user#getSessionInfo',
            //                     [],
            //                     {
            //                         iovationBlackBox: $rootScope.ioBlackBox
            //                     }
            //                 ).then(function (response) {
            //                     $rootScope.userdata.username = response.kwargs.username;
            //                 })
            //
            //                 $wamp.call(
            //                     '/user/account#getGamingAccounts',
            //                     [],
            //                     {
            //                         iovationBlackBox: $rootScope.ioBlackBox,
            //                         expectBalance: true
            //                     }
            //                 ).then(function (response) {
            //                     $rootScope.userdata.userbalance = response.kwargs.accounts[0].amount.toString() + ' ' + response.kwargs.accounts[0].currency;
            //                 }, function (error) {
            //
            //                 })
            //
            //             }
            //             $rootScope.loggedin = true;
            //             $state.go('master.home');
            //
            //         }
            //         else {
            //             alert('Something went wrong! Please try again in a few minutes.');
            //         }
            //     }, function (response) {
            //         if(response.data.status == 'error') {
            //             alert(response.data.message);
            //         }
            //         else {
            //             alert('Something went wrong! Please try again in a few minutes.');
            //         }
            //     })

            $wamp.call(
                '/user#login',
                [],
                {
                    usernameOrEmail: $scope.logincreds.usernameOrEmail,
                    password: $scope.logincreds.password,
                    iovationBlackBox: $rootScope.ioBlackBox
                }
            ).then(function (response) {
                if(response.kwargs.loginCount >= 0) {
                    $http.post($rootScope.apiUrl + 'login/web', $scope.logincreds)
                        .then(function (response) {
                            if(response.status == 200) {

                                if(response.data.status == 'error') {
                                    alert('Invalid login credentials! Please try again.');
                                    return;
                                }

                                if($scope.logincreds.rememberme) {
                                    localStorage.setItem('user_token', response.data.token);
                                    localStorage.setItem('token_type', response.data.Bearer);
                                    localStorage.setItem('refresh_token', response.data.refresh_token);

                                    $rootScope.userdata = {
                                        user_token: response.data.token,
                                        token_type: response.data.Bearer,
                                        refresh_token: response.data.refresh_token
                                    }

                                    $wamp.call(
                                        '/user#setClientIdentity',
                                        [],
                                        {
                                            groupID: localStorage.getItem('groupID')
                                        }
                                    ).then(function (response) {
                                        localStorage.setItem('groupID', response.kwargs.groupID);
                                    })

                                    $wamp.call(
                                        '/user#getSessionInfo',
                                        [],
                                        {
                                            iovationBlackBox: $rootScope.ioBlackBox
                                        }
                                    ).then(function (response) {
                                        $rootScope.userdata.username = response.kwargs.username;
                                    })

                                }
                                else {
                                    sessionStorage.setItem('user_token', response.data.token);
                                    sessionStorage.setItem('token_type', response.data.Bearer);
                                    sessionStorage.setItem('refresh_token', response.data.refresh_token);

                                    $rootScope.userdata = {
                                        user_token: response.data.token,
                                        token_type: response.data.Bearer,
                                        refresh_token: response.data.refresh_token
                                    }

                                    $wamp.call(
                                        '/user#setClientIdentity',
                                        [],
                                        {
                                            groupID: localStorage.getItem('groupID')
                                        }
                                    ).then(function (response) {
                                        localStorage.setItem('groupID', response.kwargs.groupID);
                                    })

                                    $wamp.call(
                                        '/user#getSessionInfo',
                                        [],
                                        {
                                            iovationBlackBox: $rootScope.ioBlackBox
                                        }
                                    ).then(function (response) {
                                        $rootScope.userdata.username = response.kwargs.username;
                                    })

                                    $wamp.call(
                                        '/user/account#getGamingAccounts',
                                        [],
                                        {
                                            iovationBlackBox: $rootScope.ioBlackBox,
                                            expectBalance: true
                                        }
                                    ).then(function (response) {
                                        $rootScope.userdata.userbalance = response.kwargs.accounts[0].amount.toString() + ' ' + response.kwargs.accounts[0].currency;
                                    }, function (error) {

                                    })

                                }
                                $rootScope.loggedin = true;
                                $state.go('master.lobby');

                            }
                            else {
                                alert('Something went wrong! Please try again in a few minutes.');
                            }
                        }, function (response) {
                            if(response.data.status == 'error') {
                                alert(response.data.message);
                            }
                            else {
                                alert('Something went wrong! Please try again in a few minutes.');
                            }
                        })
                }
            }, function (error) {
                alert(error.kwargs.desc);
            })

        }

        $scope.gosignup = function () {

            $wamp.call(
                '/user/account#validateUsername',
                [],
                {
                    username: $scope.signupcreds.email,
                    iovationBlackBox: $rootScope.ioBlackBox
                }
            ).then(function (response) {
                if(!response.kwargs.isAvailable) {
                    alert('This email has already been registered with us. Enter a different email or sign in with the existing account.');
                    return;
                }
                else if(response.kwargs.isAvailable && response.kwargs.error == null) {

                    try{
                        if(window.location.href.split('?')[1].split('#')[0].split('=')[1]) {
                            var data = {
                                emailVerificationURL: 'http://www.draftbuddies.com/activateuser/key=xxxxxxxxxxxxx',
                                title: $scope.signupcreds.title,
                                firstname: $scope.signupcreds.fname,
                                surname: $scope.signupcreds.lname,
                                email: $scope.signupcreds.email,
                                username: $scope.signupcreds.username,
                                password: $scope.signupcreds.upswd,
                                country: $scope.signupcreds.country,
                                currency: "EUR",
                                iovationBlackBox: $rootScope.ioBlackBox,
                                affl_code: window.location.href.split('?')[1].split('#')[0].split('=')[1]
                            };
                        }
                    }
                    catch(e) {
                        var data = {
                            emailVerificationURL: 'http://www.draftbuddies.com/activateuser/key=xxxxxxxxxxxxx',
                            title: $scope.signupcreds.title,
                            firstname: $scope.signupcreds.fname,
                            surname: $scope.signupcreds.lname,
                            email: $scope.signupcreds.email,
                            username: $scope.signupcreds.username,
                            password: $scope.signupcreds.upswd,
                            country: $scope.signupcreds.country,
                            currency: "EUR",
                            iovationBlackBox: $rootScope.ioBlackBox
                        };
                    }
                    $wamp.call(
                        '/user/account#register',
                        [],
                        data
                    ).then(function (response) {

                        if(response == null) {
                            $http.post($rootScope.apiUrl + 'register', data)
                                .then(function (response) {
                                    if(response.data.status == 'success') {
                                        alert('You have successfully signed up! Login to continue');
                                    }
                                    else if(response.data.status == 'error') {
                                        alert(response.data.message);
                                    }
                                    else {
                                        alert('Something went wrong! Please try again in a few minutes.');
                                    }
                                }, function (response) {
                                    alert('Something went wrong! Please try again in a few minutes.');
                                })
                        }
                        else {

                        }

                    })

                }
                else {
                    alert(response.kwargs.error);
                }
            })

        }

    })
    .controller('homeCtrl', function ($rootScope, $scope) {

    })
    .controller('aboutCtrl', function ($rootScope, $scope) {

    })
    .controller('mycontestsCtrl', function ($rootScope, $scope, $http, $state, ModalService) {
        
        $scope.tabtoshow = '';
        $scope.contests = [];
        $scope.status = [];
        $scope.toinvite = [];
        $scope.selectedcontests = [];

        $http({
            method: 'GET',
            url: $rootScope.apiUrl + 'user/contests',
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
            },
            params: {
                filter: $scope.tabtoshow
            }
        }).then(function (response) {
            $scope.contests = response.data.data;
        }, function (error) {
        })

        $scope.$watch(function () {
            return $scope.tabtoshow
        }, function (newVal, oldVal, scope) {

            $http({
                method: 'GET',
                url: $rootScope.apiUrl + 'user/contests',
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                },
                params: {
                    filter: newVal
                }
            }).then(function (response) {
                $scope.contests = response.data.data;
            }, function (error) {
            })
        });

        $scope.gotoContest = function (contest) {
            $rootScope.selectedContest = contest;
            $state.go('master.joincontest');
        }

        $scope.goToLiveContest = function (contest) {
            $rootScope.selectedContest = contest;
            $state.go('master.livepick8');
        }

        $scope.invitefriends = function () {

            $scope.toinvite.forEach(function (value, index) {
                if(value == true)
                    $scope.selectedcontests.push(index);
            })

            if($scope.selectedcontests.length < 1) {
                alert('Select at least 1 contest to invite friends into!');
                return;
            }

            ModalService.showModal({
                templateUrl: 'modals/invitefriends.html',
                controller: function ($scope, $http, $element, contests, close) {
                    $scope.cancel = function() {
                        $element.modal('hide');
                        close({
                        }, 500); // close, but give 500ms for bootstrap to animate
                    }
                    $scope.friends = [];
                    $scope.friendsToInvite = [];
                    $scope.selectedFriends = [];

                    $http({
                        method: 'GET',
                        url: $rootScope.apiUrl + 'user/friends',
                        headers: {
                            'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                        }
                    }).then(function (response) {
                        $scope.friends = response.data.data;
                    }, function (error) {

                    })

                    $scope.invite = function () {

                        $scope.friendsToInvite.forEach(function (value, index) {
                            if(value == true)
                                $scope.selectedFriends.push(index);
                        })

                        if($scope.selectedFriends.length < 1) {
                            alert('Select at least 1 friend to invite!');
                            return;
                        }

                        $http({
                            method: 'POST',
                            url: $rootScope.apiUrl + 'contest/invite',
                            headers: {
                                'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                            },
                            params: {
                                user_id: JSON.stringify($scope.selectedFriends),
                                contest_id: JSON.stringify(contests)
                            }
                        }).then(function (response) {
                            if(response.data.status == 'success') {
                                alert('Your friends have been invited!');
                            }
                            else {
                                alert('Something went wrong! Please try again.');
                            }
                        }, function (error) {
                            alert('Could not send invites! Please try again.');
                        })

                    }

                },
                inputs: {
                    contests: $scope.selectedcontests
                }
            }).then(function (modal) {
                modal.element.modal();
                modal.close.then(function (result) {
                    if(result.length > 0) {
                        $http({
                            method: 'POST',
                            url: $rootScope.apiUrl + 'lineup',
                            headers: {
                                'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                            },
                            params: {
                                name: result,
                                players: JSON.stringify($scope.selectedplayers)
                            }
                        }).then(function (response) {
                            if(response.data.status == 'success') {
                                alert('Lineup has been successfully saved!');
                            }
                            else {
                                alert('Something went wrong! Please try again.')
                            }
                        }, function (error) {
                            alert('Could not save lineup! Please try again.');
                        })
                    }
                })
            })

        }
        
    })
    .controller('joincontestCtrl', function ($rootScope, $scope, $http, ModalService) {

        $scope.players = [];
        $scope.selectedplayers = [];
        $scope.teams = [];
        $scope.matches = [];
        $scope.positions = [];
        $scope.filter = {
            
        }
        $scope.selection = {
            striker: [],
            om: [],
            dm: [],
            defence: ''
        }
        $scope.salaryCap = 50000;
        $scope.selectedSalary = 0;

        $scope.getTeamById = function (id){
            var field = {};
            $scope.countries.some(function(itm){
                if(itm.code === country){
                    field = itm;
                    return true;
                }
            });
            return field;
        }

        $http({
            method: 'GET',
            url: $rootScope.apiUrl + 'players',
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
            },
            params: {
                contest_id: $rootScope.selectedContest.id
            }
        }).then(function (response) {
            response.data.data.forEach(function (value, index) {
                console.log(value);
                var match = {
                    team1: value.match[0].team.name,
                    team2: value.match[1].team.name,
                    schedule: value.match.scheduled_on,
                    id: value.match.id
                }
                $scope.matches.push(match);
                for(var i=0; i<2; i++) {
                    var teamdata = {
                        name: value.match[i].team.name,
                        id: value.match[i].team.id,
                        salary: value.match[i].team.salary
                    }
                    $scope.teams.push(teamdata);
                    value.match[i].players.forEach(function (nvalue, index) {
                        var data = {
                            player: nvalue,
                            match: match,
                            team: value.match[i].team.name,
                            salary: nvalue.salary,
                            taken: nvalue.is_taken
                        }
                        if($scope.players.indexOf(data) < 0)
                            $scope.players.push(data);
                    })
                }
            })
            if($rootScope.selectedContest.user_picks) {
                $rootScope.selectedContest.user_picks.forEach(function (uvalue, index) {
                    $scope.players.forEach(function (pvalue, index) {
                        if(uvalue == pvalue.player.id) {
                            if(pvalue.player.position == 'Striker') {
                                $scope.selection.striker.push(pvalue);
                                $scope.selectedSalary += parseInt(pvalue.salary);
                                $scope.players[index].taken = true;
                            }
                            if(pvalue.player.position == 'Offensive Midfielder') {

                                if($rootScope.selectedContest.type == 'pick_2')
                                    $scope.selection.dm.push(pvalue);
                                else
                                    $scope.selection.om.push(pvalue);
                                $scope.selectedSalary += parseInt(pvalue.salary);
                                $scope.players[index].taken = true;
                            }
                            if(pvalue.player.position == 'Defensive Midfielder') {
                                $scope.selection.dm.push(pvalue);
                                $scope.selectedSalary += parseInt(pvalue.salary);
                                $scope.players[index].taken = true;
                            }

                        }
                    })
                })
            }
            if($rootScope.selectedContest.team_id) {
                $scope.selection.defence = $rootScope.selectedContest.team_id;
            }
        }, function (error) {
        })

        $scope.showPlayersByMatch = function () {
            $scope.filter.searchtext = $scope.filter.match;
        }

        $scope.showPlayersByPosition = function () {
            $scope.filter.searchtext = $scope.filter.position;
        }

        $scope.removePlayer = function (player) {

            if($rootScope.selectedContest.type == 'pick_2') {
                if(player.player.position == 'Striker') {
                    if($scope.selection.striker.indexOf(player) >= 0) {
                        $scope.selection.striker.splice($scope.selection.striker.indexOf(player), 1);
                        $scope.selectedSalary -= parseInt(player.salary);
                        player.taken = false;
                    }
                }
                else {
                    if($scope.selection.dm.indexOf(player) >= 0) {
                        $scope.selection.dm.splice($scope.selection.dm.indexOf(player), 1);
                        $scope.selectedSalary -= parseInt(player.salary);
                        player.taken = false;
                    }
                }
                return;
            }
            else {
                if(player.player.position == 'Striker') {
                    if($scope.selection.striker.indexOf(player) >= 0) {
                        $scope.selection.striker.splice($scope.selection.striker.indexOf(player), 1);
                        $scope.selectedSalary -= parseInt(player.salary);
                        player.taken = false;
                    }
                }
                else if(player.player.position == 'Defensive Midfielder') {
                    if($scope.selection.dm.indexOf(player) >= 0) {
                        $scope.selection.dm.splice($scope.selection.dm.indexOf(player), 1);
                        $scope.selectedSalary -= parseInt(player.salary);
                        player.taken = false;
                    }
                }
                else if(player.player.position == 'Offensive Midfielder') {
                    if($scope.selection.om.indexOf(player) >= 0) {
                        $scope.selection.om.splice($scope.selection.om.indexOf(player), 1);
                        $scope.selectedSalary -= parseInt(player.salary);
                        player.taken = false;
                    }
                }
            }
        }

        $scope.selectPlayer = function (player) {

            if($rootScope.selectedContest.type == 'pick_2') {

                $scope.selectedplayers = $scope.selection.striker.concat($scope.selection.dm);
                var counter = 0;
                $scope.selectedplayers.forEach(function (value, index) {
                    if(value.team == player.team)
                        counter++;
                })
                if(counter > 0) {
                    alert('You can not select more than 1 player from the same team.');
                    return;
                }

                if(player.player.position == 'Striker') {
                    if($scope.selection.striker.length >= 1 || ($scope.selection.striker.indexOf(player) >= 0) ) {
                        alert('Could not add the player! \n 1. You can add maximum 1 striker. \n 2. You can not select same player more than once.');
                        return;
                    }
                    $scope.selection.striker.push(player);
                    $scope.selectedSalary += parseInt(player.salary);
                    player.taken = true;
                }
                else if(player.player.position == 'Defensive Midfielder' || player.player.position == 'Offensive Midfielder' || player.player.position == 'Midfielder') {
                    if($scope.selection.dm.length >= 1 || ($scope.selection.dm.indexOf(player) >= 0)) {
                        alert('Could not add the player! \n 1. You can add maximum 1 midfielder. \n 2. You can not select same player more than once.');
                        return;
                    }
                    $scope.selection.dm.push(player);
                    $scope.selectedSalary += parseInt(player.salary);
                    player.taken = true;
                }
            }
            else if($rootScope.selectedContest.type == 'pick_8') {

                if($scope.selectedSalary + parseInt(player.salary) >= $scope.salaryCap) {
                    alert('Exceeds the salary cap! Please try selecting another player.');
                    return;
                }

                $scope.selectedplayers = $scope.selection.striker.concat($scope.selection.om.concat($scope.selection.dm));
                var counter = 0;
                $scope.selectedplayers.forEach(function (value, index) {
                    if(value.team == player.team)
                        counter++;
                })
                if(counter >= 2) {
                    alert('You can not select more than 2 players from the same team.');
                    return;
                }

                if(player.player.position == 'Striker') {
                    if($scope.selection.striker.length >= 3 || ($scope.selection.striker.indexOf(player) >= 0) ) {
                        alert('Could not add the player! \n 1. You can add maximum 3 strikers. \n 2. You can not select same player more than once.');
                        return;
                    }
                    $scope.selection.striker.push(player);
                    $scope.selectedSalary += parseInt(player.salary);
                    player.taken = true;
                }
                else if(player.player.position == 'Offensive Midfielder') {
                    if($scope.selection.om.length >= 3 || ($scope.selection.om.indexOf(player) >= 0)) {
                        alert('Could not add the player! \n 1. You can add maximum 3 offensive midfielders. \n 2. You can not select same player more than once.');
                        return;
                    }
                    $scope.selection.om.push(player);
                    $scope.selectedSalary += parseInt(player.salary);
                    player.taken = true;
                }
                else if(player.player.position == 'Defensive Midfielder') {
                    if($scope.selection.dm.length >= 1 || ($scope.selection.dm.indexOf(player) >= 0)) {
                        alert('Could not add the player! \n 1. You can add maximum 1 defensive midfielder. \n 2. You can not select same player more than once.');
                        return;
                    }
                    $scope.selection.dm.push(player);
                    $scope.selectedSalary += parseInt(player.salary);
                    player.taken = true;
                }
            }
        }

        $scope.joincontest = function () {
            $scope.selectedplayers = $scope.selection.striker.concat($scope.selection.om.concat($scope.selection.dm));

            if($rootScope.selectedContest.type == 'pick_8' && $scope.selectedplayers.length < 7) {
                alert('Please select at least 7 players and a defence team!');
                return;
            }

            if($rootScope.selectedContest.type == 'pick_2' && $scope.selectedplayers.length < 2) {
                alert('Please select at least 2 players!');
                return;
            }

            $http({
                method: 'POST',
                url: $rootScope.apiUrl + 'picks',
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                },
                params: {
                    contest_id: $rootScope.selectedContest.id,
                    players: JSON.stringify($scope.selectedplayers),
                    team_id: $scope.selection.defence
                }
            }).then(function (response) {
                if(response.data.status == 'success') {
                    alert('Your pick has been saved successfully! Pay the fees to complete your participation.');
                }
                else {
                    alert('Could not save your pick! Please try again.');
                }
            }, function (error) {
                alert(error.data.message);
            })
        }
        
        $scope.savelineup = function () {

            $scope.selectedplayers = $scope.selection.striker.concat($scope.selection.om.concat($scope.selection.dm));

            if($scope.selectedplayers.length > 0) {

                ModalService.showModal({
                    templateUrl: 'modals/savelineup.html',
                    controller: function ($scope, $http, $element, close) {
                        $scope.cancel = function() {
                            $element.modal('hide');
                            close({
                                name: $scope.name,
                                age: $scope.age
                            }, 500); // close, but give 500ms for bootstrap to animate
                        }
                        $scope.caption = '';
                        $scope.returnLineupName = function () {
                            close($scope.caption, 500);
                        }
                    }
                }).then(function (modal) {
                    modal.element.modal();
                    modal.close.then(function (result) {
                        if(result.length > 0) {
                            $http({
                                method: 'POST',
                                url: $rootScope.apiUrl + 'lineup',
                                headers: {
                                    'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                                },
                                params: {
                                    name: result,
                                    players: JSON.stringify($scope.selectedplayers)
                                }
                            }).then(function (response) {
                                if(response.data.status == 'success') {
                                    alert('Lineup has been successfully saved!');
                                }
                                else {
                                    alert('Something went wrong! Please try again.')
                                }
                            }, function (error) {
                                alert('Could not save lineup! Please try again.');
                            })
                        }
                    })
                })
            }
        }

        $scope.playerinfo = function (id) {

            ModalService.showModal({
                templateUrl: 'modals/playerinfo.html',
                controller: function ($scope, $http, $element, player, close) {
                    $scope.cancel = function() {
                        $element.modal('hide');
                        close({
                        }, 500); // close, but give 500ms for bootstrap to animate
                    }
                    $scope.player = {};
                    $scope.player.bio = {};

                    $http({
                        method: 'GET',
                        url: $rootScope.apiUrl + 'player/' + id,
                        headers: {
                            'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                        }
                    }).then(function (response) {
                        console.log(response);
                        $scope.player = response.data.data;
                        $scope.player.bio = JSON.parse($scope.player.stats).Stat;
                    }, function (error) {
                    })
                },
                inputs: {
                    player: id
                }
            }).then(function (modal) {
                modal.element.modal();
                modal.close.then(function () {

                })
            })

        }

    })
    .controller('lobbyCtrl', function ($rootScope, $scope, $http, $state, ModalService) {

        $scope.contests = [];
        $scope.dates = [];
        $scope.matches = [];
        $scope.days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        $scope.startdate = new Date();
        $scope.startdate.setDate($scope.startdate.getUTCDate() + 1);
        $scope.enddate = new Date();
        $scope.enddate.setDate($scope.startdate.getUTCDate() + 6);
        $scope.dateoffset = 'today';


        for(var d = $scope.startdate; d < $scope.enddate; d.setDate(d.getUTCDate() + 1)) {
            $scope.dates.push(new Date(d));
        }

        $scope.today = new Date();

        $scope.contest = {
            match_date: $scope.today.getUTCFullYear() + '-' + ('0' + ($scope.today.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + $scope.today.getUTCDate()).slice(-2)
        }

        $scope.tabtoshow = 'entrants';
        $scope.filter = {
            fee: {
                min: 1,
                max: 1000
            },
            entrants: {
                min: 0,
                max: 100000
            }
        }

        $scope.setentrants = function (min, max) {
            $scope.filter.entrants = {
                min: min,
                max: max
            }
        }

        $scope.setfee = function (min, max) {
            $scope.filter.fee = {
                min: min,
                max: max
            }
        }

        $scope.matchEntrants = function (item) {
            return (item.entrant_count >= $scope.filter.entrants.min && item.entrant_count <= $scope.filter.entrants.max);
        }

        $scope.matchFee = function (item) {
            return (item.entry_fee >= $scope.filter.fee.min && item.entry_fee <= $scope.filter.fee.max);
        }

        $scope.leagues = [];
        
        $http({
            method: 'GET',
            url: $rootScope.apiUrl + 'contest',
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
            }
        }).then(function (response) {
            $scope.contests = response.data.data;
        }, function (error) {
        })

        $http({
            method: 'GET',
            url: $rootScope.apiUrl + 'competitions',
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
            }
        }).then(function (response) {
            $scope.leagues = response.data.data;
        }, function (error) {
        })

        $scope.getMatches = function (date, offset) {
            if(offset) {
                $scope.dateoffset = offset;
            }
            if($scope.dateoffset == 'today') {
                $scope.filter.match_date = $scope.today.getUTCFullYear() + '-' + ('0' + ($scope.today.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + $scope.today.getUTCDate()).slice(-2)
            }
            else {
                $scope.filter.match_date = $scope.dates[$scope.dateoffset].getUTCFullYear() + '-' + ('0' + ($scope.dates[$scope.dateoffset].getUTCMonth() + 1)).slice(-2) + '-' + ('0' + $scope.dates[$scope.dateoffset].getUTCDate()).slice(-2);
            }
            $http({
                method: 'GET',
                url: $rootScope.apiUrl + 'matches',
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                },
                params: {
                    competition_id: $scope.filter.competition,
                    match_date: date,
                    type: ''
                }
            }).then(function (response) {
                response.data.data.forEach(function (value, index) {
                    value.scheduled_on = new Date(value.scheduled_on);
                })
                $scope.matches = response.data.data;
            }, function (error) {
            })
        }

        $scope.clearFilters = function () {

        }

        $scope.gotoContest = function (contest) {
            $rootScope.selectedContest = contest;
            $state.go('master.joincontest');
        }

        $scope.leaveContest = function (contest) {
            var perm = confirm('Do you really want to leave this contest? \n If you have paid the fees, it will be refunded ot your wallet.');
            if(perm) {
                $http({
                    method: 'POST',
                    url: $rootScope.apiUrl + 'contest/leave',
                    headers: {
                        'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                    },
                    params: {
                        contest_id: contest
                    }
                }).then(function (response) {
                    if(response.data.status == 'success') {
                        alert('You have left the contest successfully!');
                        $state.reload();
                    }
                    else {
                        alert('Something went wrong! Please try again.');
                    }
                }, function (error) {
                    alert('Could not leave the contest! Please try again.');
                })
            }
        }

    })
    .controller('createContestCtrl', function ($rootScope, $scope, $http, $state) {

        $scope.leagues = [];
        $scope.dates = [];
        $scope.dates_fullround = [];
        $scope.matches = [];
        $scope.days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        $scope.startdate = new Date();
        $scope.startdate.setDate($scope.startdate.getUTCDate() + 1);
        $scope.enddate = new Date();
        $scope.enddate.setDate($scope.startdate.getUTCDate() + 6);
        $scope.today = new Date();

        for(var d = $scope.startdate; d < $scope.enddate; d.setDate(d.getUTCDate() + 1)) {
            $scope.dates.push(new Date(d));
            if((d.getDay() == 0 || d.getDay() == 1 || d.getDay() == 5 || d.getDay() == 6) && d.getTime() > $scope.today.getTime())
                $scope.dates_fullround.push(d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2));
        }

        $scope.contest = {
            competition_id: '',
            match_date: JSON.stringify([$scope.today.getUTCFullYear() + '-' + ('0' + ($scope.today.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + $scope.today.getUTCDate()).slice(-2)]),
            type: ''
        }

        $http({
            method: 'GET',
            url: $rootScope.apiUrl + 'competitions',
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
            }
        }).then(function (response) {
            $scope.leagues = response.data.data;
        }, function (error) {
        })

        $scope.contestfields = {
            gamePick: '',
            league: '',
            matches: [],
            entrants: 0,
            fee: 0,
            contestType: 'public'
        }

        $scope.set2Entrants = function () {
            if($scope.contest.type == 'pick_2') {
                $scope.contest.entrants = 2;
                $scope.contest.award_id = 1;
            }
            if($scope.matches.length < 2 && $scope.contest.type == 'pick_8' &&  $scope.contest.competition_id != '') {
                alert('This date does not have enough matches to create a Pick 8 contest! Pick another date.');
                $scope.matches = [];
            }
        }

        $scope.set5Entrants = function () {
            if($scope.contest.type == 'pick_8') {
                $scope.contest.entrants = 5;
            }
            if($scope.matches.length < 2 && $scope.contest.type == 'pick_8' &&  $scope.contest.competition_id != '') {
                alert('This date does not have enough matches to create a Pick 8 contest! Pick another date.');
                $scope.matches = [];
            }
        }

        $scope.getMatches = function () {
            $http({
                method: 'GET',
                url: $rootScope.apiUrl + 'matches',
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                },
                params: $scope.contest
            }).then(function (response) {
                response.data.data.forEach(function (value, index) {
                    value.scheduled_on = new Date(value.scheduled_on);
                })

                if($scope.matches.length < 2 && $scope.contest.type == 'pick_8') {
                    alert('This date does not have enough matches to create a Pick 8 contest! Pick another date.');
                }
                else {
                    $scope.matches = response.data.data;
                }

            }, function (error) {
            })
        }

        $scope.getMultipleMatches = function () {
            $http({
                method: 'GET',
                url: $rootScope.apiUrl + 'matches',
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                },
                params: $scope.contest
            }).then(function (response) {
                response.data.data.forEach(function (value, index) {
                    value.scheduled_on = new Date(value.scheduled_on);
                })
                $scope.matches = response.data.data;
            }, function (error) {
            })
        }

        $scope.createContest = function () {
            $http({
                method: 'POST',
                url: $rootScope.apiUrl + 'contest',
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                },
                params: $scope.contest
            }).then(function (response) {
                if(response.data.status == 'success') {
                    alert('Your contest was successfully created! You can join this contest from lobby.');
                    $state.go('master.lobby');
                }
                else {
                    alert('Something went wrong. Please try again.');
                }
            }, function (error) {
                alert('Could not create your contest! Please try again.');
            })
        }

    })
    .controller('profileCtrl', function ($rootScope, $scope, $wamp, $state, $http) {
        
        $scope.regions = [];
        
        $scope.profileFields = {};

        $scope.flags = {
            isBirthDateUpdatable: false,
            isCountryUpdatable: false,
            isCurrencyUpdatable: false,
            isEmailUpdatable: false,
            isFirstnameUpdatable: false,
            isSurnameUpdatable: false
        }

        $wamp.call(
            '/user/account#getProfile',
            []
        ).then(function (response) {
            $scope.profileFields = response.kwargs.fields;
            $scope.profileFields.birthDate = new Date(response.kwargs.fields.birthDate);
            $scope.profileFields.country = response.kwargs.fields.country;
            $scope.profileFields.currency = response.kwargs.fields.currency;
            $scope.profileFields.securityQuestion = response.kwargs.fields.securityQuestion;

            $scope.flags = response.kwargs;

        }, function (error) {

            if(error.kwargs.desc == 'User is not logged in') {
                alert('Sorry! Your session has expired. Please login again!');
                $rootScope.logout();
            }

            alert('Sorry! Could not gather the profile information at this time. Please try again!');
        })
        
        $scope.getRegions = function () {
            $scope.regions = $rootScope.getPrefixByCountry($scope.profileFields.country).regions;
        }

        $scope.updateProfile = function () {
            $wamp.call(
                '/user/account#updateProfile',
                [],
                $scope.profileFields
            ).then(function (response) {
                alert('Your profile has been updated successfully!');
                $wamp.call(
                    '/user/account#getProfile',
                    []
                ).then(function (response) {
                    $scope.profileFields = response.kwargs.fields;
                    $scope.profileFields.birthDate = new Date(response.kwargs.fields.birthDate);
                    $scope.profileFields.country = response.kwargs.fields.country;
                    $scope.profileFields.currency = response.kwargs.fields.currency;
                    $scope.profileFields.securityQuestion = response.kwargs.fields.securityQuestion;

                    $scope.flags = response.kwargs;

                }, function (error) {

                    if(error.kwargs.desc == 'User is not logged in') {
                        alert('Sorry! Your session has expired. Please login again!');
                        $rootScope.logout();
                    }

                    alert('Sorry! Could not gather the profile information at this time. Please try again!');
                })
            }, function (error) {
                alert('Sorry! Could not update your profile. Please try again!')
            })
        }
        
    })
    .controller('livepick8Ctrl', function ($scope, $rootScope, $http, $state, ModalService, liveSocket) {

        liveSocket.emit('ping', {name: 'abc'});

        liveSocket.on('pingback', function (data) {
            console.log(data);
        })

    })
    .controller('depositMethodsCtrl', function ($scope, $rootScope, $wamp, $state) {

        $scope.depositmethods = {};

        $wamp.call(
            '/user/deposit#getPaymentMethods',
            [],
            {
                iovationBlackBox: $rootScope.ioBlackBox
            }
        ).then(function (response) {
            console.log(response);
            $scope.depositmethods = response.kwargs.paymentMethods;
        }, function (error) {

        })

        $scope.selectPaymentMethod = function (code) {
            $rootScope.selectedPaymentMethod = code;
            $state.go('master.paymentconfig');
        }

    })
    .controller('paymentConfigCtrl', function ($scope, $rootScope, $http, $wamp, $state) {

        $state.go('master.cardpayment');


    })
    .controller('cardPaymentCtrl', function ($scope, $rootScope, $wamp, $state, $http, ModalService) {

        $scope.paymentconfig = {};
        $scope.paymentdetails = {};
        $scope.carddetails = {};

        $wamp.call(
            '/user/deposit#getPaymentMethodCfg',
            [],
            {
                iovationBlackBox: $rootScope.ioBlackBox,
                paymentMethodCode: $rootScope.selectedPaymentMethod
            }
        ).then(function (response) {
            if(response.kwargs.fields.payCardID) {
                $scope.paymentconfig = response.kwargs;
                console.log($scope.paymentconfig);
            }
        }, function (error) {
            alert('This payment method can not be used at the moment! Please select another method.');
            $state.go('master.depositmethods');
        })

        $scope.payamount = function () {

            $wamp.call(
                '/user/deposit#prepare',
                [],
                {
                    iovationBlackBox: $rootScope.ioBlackBox,
                    paymentMethodCode: $rootScope.selectedPaymentMethod,
                    fields: $scope.carddetails
                }
            ).then(function (response) {

                console.log(response);

            }, function (error) {
                alert('This payment could not be completed! Please try again.');
            })

        }

        $scope.addnewcard = function () {

            ModalService.showModal({
                templateUrl: 'modals/newcard.html',
                controller: function ($scope, $http, $wamp, $element, methodcode, close) {

                    $scope.carddetails = {};

                    $scope.cancel = function() {
                        $element.modal('hide');
                        close({
                        }, 500);
                    }

                    $scope.paywithcard = function() {
                        $element.modal('hide');
                        close($scope.carddetails, 500);
                    }

                    $scope.registernewcard = function () {
                        $wamp.call(
                            '/user/deposit#registerPayCard',
                            [],
                            {
                                iovationBlackBox: $rootScope.ioBlackBox,
                                paymentMethodCode: methodcode,
                                fields: $scope.carddetails.fields
                            }
                        ).then(function (response) {
                            console.log(response);
                        }, function (error) {
                            alert('This card could not be registered at this time! Please try again.');
                        })
                    }

                },
                inputs: {
                    methodcode: $rootScope.selectedPaymentMethod
                }
            }).then(function (modal) {
                modal.element.modal();
                modal.close.then(function (carddetails) {
                    $scope.carddetails = carddetails;
                    $scope.paymentdetails
                })
            })

        }

    })
    .controller('referFriendsCtrl', function ($scope, $rootScope, $state, $http, ModalService) {
        $http({
            method: 'GET',
            url: $rootScope.apiUrl + 'user/affl-code',
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
            }
        }).then(function (response) {
            $scope.afflcode = response.data.data;
        }, function (error) {
        })

        $scope.emailfriends = function () {

            ModalService.showModal({
                templateUrl: 'modals/referfriends.html',
                controller: function ($scope, $http, $element, close) {

                    $scope.idtosend = '';

                    $scope.cancel = function() {
                        $element.modal('hide');
                        close({
                        }, 500); // close, but give 500ms for bootstrap to animate
                    }

                    $scope.sendemail = function () {
                        $http({
                            method: 'POST',
                            url: $rootScope.apiUrl + 'invite',
                            headers: {
                                'Authorization': 'Bearer ' + sessionStorage.getItem('user_token')
                            },
                            params: {
                                email: $scope.idtosend
                            }
                        }).then(function (response) {
                            if(response.data.status == 'success') {
                                alert('Your friend has been invited!');
                                $scope.idtosend = '';
                            }
                        }, function (error) {
                            alert('Your friend could not be invited!');
                        })
                    }

                }
            }).then(function (modal) {
                modal.element.modal();
                modal.close.then(function () {

                })
            })

        }

    })
    .controller('adminCtrl', function ($scope, $rootScope, $state, $http, ModalService) {

        $rootScope.apiUrl = 'http://api.draftbuddies.com/public/api/';

        try{
            $rootScope.adminloggedin = sessionStorage.getItem('adminloggedin');
        }catch(e) {
            $rootScope.adminloggedin = false;
        }

        $rootScope.currentpage = 'users';

        $rootScope.logout = function () {
            sessionStorage.removeItem('admin_token');
            sessionStorage.removeItem('token_type');
            sessionStorage.removeItem('refresh_token');
            $rootScope.adminloggedin = false;

            $state.go('adminlogin');
        }

    })
    .controller('adminHeaderCtrl', function ($scope, $rootScope, $state, $http, ModalService) {



    })
    .controller('adminUsersCtrl', function ($scope, $rootScope, $state, $http) {

        $scope.users = [];
        $scope.from = 1;
        $scope.take = 10;
        $scope.nav = {
            next: true,
            prev: false
        }
        $scope.total;

        $http({
            method: 'GET',
            url: $rootScope.apiUrl + 'admin/users',
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
            },
            params: {
                from: 0,
                take: 10
            }
        }).then(function (response) {
            $scope.users = response.data.data;
        }, function (error) {
        })

        $scope.next = function () {

            if(($scope.from + $scope.take) < $scope.total) {
                $scope.from += $scope.take;
                $scope.nav.prev = true;
            }
            else
                $scope.nav.next = false;

            if($scope.nav.next) {
                $http({
                    method: 'GET',
                    url: $rootScope.apiUrl + 'admin/users',
                    headers: {
                        'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                    },
                    params: {
                        from: $scope.from,
                        take: $scope.take
                    }
                }).then(function (response) {
                    console.log(response);

                    if(($scope.from + $scope.take) >= $scope.total) {
                        $scope.nav.next = false;
                    }

                    $scope.users = response.data.data;
                }, function (error) {
                })
            }

        }

        $scope.prev = function () {

            if(($scope.from - $scope.take) > 0) {
                $scope.from -= $scope.take;
            }
            else
                $scope.nav.prev = false;

            if($scope.nav.prev) {
                $http({
                    method: 'GET',
                    url: $rootScope.apiUrl + 'admin/users',
                    headers: {
                        'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                    },
                    params: {
                        from: $scope.from,
                        take: $scope.take
                    }
                }).then(function (response) {
                    console.log(response);

                    if(($scope.from - $scope.take) <= 0) {
                        $scope.nav.prev = false;
                    }

                    $scope.users = response.data.data;
                }, function (error) {
                })
            }

        }

        $scope.toggleuser = function (user) {
            $http({
                method: 'POST',
                url: $rootScope.apiUrl + 'admin/user/ban',
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                },
                params: {
                    user_id: user,
                    note: ''
                }
            }).then(function (response) {
                $http({
                    method: 'GET',
                    url: $rootScope.apiUrl + 'admin/users',
                    headers: {
                        'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                    },
                    params: {
                        from: 0,
                        take: 10
                    }
                }).then(function (response) {
                    $scope.users = response.data.data;
                }, function (error) {
                })
            }, function (error) {
                alert('Could not change user status! Please try again.');
            })
        }

    })
    .controller('adminPlayersCtrl', function ($scope, $rootScope, $state, $http) {

        $scope.players = [];
        $scope.from = 1;
        $scope.take = 10;
        $scope.nav = {
            next: true,
            prev: false
        }
        $scope.total;

        $http({
            method: 'GET',
            url: $rootScope.apiUrl + 'admin/players',
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
            },
            params: {
                from: 0,
                take: $scope.take
            }
        }).then(function (response) {
            console.log(response);
            $scope.total = response.data.total;
            $scope.players = response.data.data;
            $scope.players.forEach(function (value, index) {
                $scope.players[index].bio = (JSON.parse(value.stats)).Stat;
            })
        }, function (error) {
        })

        $scope.next = function () {

            if(($scope.from + $scope.take) < $scope.total) {
                $scope.from += $scope.take;
                $scope.nav.prev = true;
            }
            else
                $scope.nav.next = false;

            if($scope.nav.next) {
                $http({
                    method: 'GET',
                    url: $rootScope.apiUrl + 'admin/players',
                    headers: {
                        'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                    },
                    params: {
                        from: $scope.from,
                        take: $scope.take
                    }
                }).then(function (response) {
                    console.log(response);

                    if(($scope.from + $scope.take) >= $scope.total) {
                        $scope.nav.next = false;
                    }

                    $scope.players = response.data.data;
                    $scope.players.forEach(function (value, index) {
                        $scope.players[index].bio = (JSON.parse(value.stats)).Stat;
                    })
                }, function (error) {
                })
            }

        }

        $scope.prev = function () {

            if(($scope.from - $scope.take) > 0) {
                $scope.from -= $scope.take;
            }
            else
                $scope.nav.prev = false;

            if($scope.nav.prev) {
                $http({
                    method: 'GET',
                    url: $rootScope.apiUrl + 'admin/players',
                    headers: {
                        'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                    },
                    params: {
                        from: $scope.from,
                        take: $scope.take
                    }
                }).then(function (response) {
                    console.log(response);

                    if(($scope.from - $scope.take) <= 0) {
                        $scope.nav.prev = false;
                    }

                    $scope.players = response.data.data;
                    $scope.players.forEach(function (value, index) {
                        $scope.players[index].bio = (JSON.parse(value.stats)).Stat;
                    })
                }, function (error) {
                })
            }

        }

        $scope.changeSalary = function (uid,index) {
            $http({
                method: 'POST',
                url: $rootScope.apiUrl + 'admin/player',
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                },
                params: {
                    player_uid: uid,
                    salary: $scope.players[index].salary
                }
            }).then(function (response) {
                $http({
                    method: 'GET',
                    url: $rootScope.apiUrl + 'admin/players',
                    headers: {
                        'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                    },
                    params: {
                        from: $scope.from,
                        take: $scope.take
                    }
                }).then(function (response) {
                    console.log(response);
                    $scope.players = response.data.data;
                    $scope.players.forEach(function (value, index) {
                        $scope.players[index].bio = (JSON.parse(value.stats)).Stat;
                    })
                }, function (error) {
                })
            }, function (error) {
                alert('Could not update player salary! Please try again.');
            })
        }

    })
    .controller('adminAwardsCtrl', function ($scope, $rootScope, $state, $http, ModalService) {

        $scope.awards = [];
        $scope.from = 1;
        $scope.take = 10;
        $scope.nav = {
            next: true,
            prev: false
        }
        $scope.total;

        $http({
            method: 'GET',
            url: $rootScope.apiUrl + 'admin/awards',
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
            },
            params: {
                from: 0,
                take: $scope.take
            }
        }).then(function (response) {
            $scope.total = response.data.total;
            console.log(response);
            $scope.awards = response.data.data;
        }, function (error) {
        })

        $scope.next = function () {

            if(($scope.from + $scope.take) < $scope.total) {
                $scope.from += $scope.take;
                $scope.nav.prev = true;
            }
            else
                $scope.nav.next = false;

            if($scope.nav.next) {
                $http({
                    method: 'GET',
                    url: $rootScope.apiUrl + 'admin/awards',
                    headers: {
                        'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                    },
                    params: {
                        from: $scope.from,
                        take: $scope.take
                    }
                }).then(function (response) {
                    console.log(response);

                    if(($scope.from + $scope.take) >= $scope.total) {
                        $scope.nav.next = false;
                    }

                    $scope.awards = response.data.data;
                }, function (error) {
                })
            }

        }

        $scope.prev = function () {

            if(($scope.from - $scope.take) > 0) {
                $scope.from -= $scope.take;
            }
            else
                $scope.nav.prev = false;

            if($scope.nav.prev) {
                $http({
                    method: 'GET',
                    url: $rootScope.apiUrl + 'admin/awards',
                    headers: {
                        'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                    },
                    params: {
                        from: $scope.from,
                        take: $scope.take
                    }
                }).then(function (response) {
                    console.log(response);

                    if(($scope.from - $scope.take) <= 0) {
                        $scope.nav.prev = false;
                    }

                    $scope.awards = response.data.data;
                }, function (error) {
                })
            }

        }

        $scope.addAward = function () {

            ModalService.showModal({
                templateUrl: 'modals/addaward.html',
                controller: function ($scope, $http, $element, close) {
                    $scope.cancel = function() {
                        $element.modal('hide');
                        close({
                        }, 500); // close, but give 500ms for bootstrap to animate
                    }

                    $scope.award = {
                        caption: '',
                        winners: 1,
                        rewards: []
                    };
                    $scope.awardItems = [];

                    $scope.range = function(n) {
                        return new Array(n);
                    };

                    $scope.createAward = function () {

                        if($scope.award.type == 'share') {
                            $scope.award.rewards.forEach(function (value, index) {
                                var data = {
                                    rank: index + 1,
                                    share: value.share,
                                    type: 'share'
                                }
                                $scope.awardItems.push(data);
                            })
                        }
                        else if($scope.award.type == 'reward') {
                            $scope.award.rewards.forEach(function (value, index) {
                                var data = {
                                    rank: index + 1,
                                    reward: value.share,
                                    type: 'reward'
                                }
                                $scope.awardItems.push(data);
                            })
                        }

                        $http({
                            method: 'POST',
                            url: $rootScope.apiUrl + 'admin/award',
                            headers: {
                                'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                            },
                            params: {
                                name: $scope.award.caption,
                                min_entrants: $scope.award.rewards.length,
                                award_items: JSON.stringify($scope.awardItems)

                            }
                        }).then(function (response) {
                            if(response.data.status == 'success')
                                alert('Award has been added successfully!');
                        }, function (error) {
                            alert('Award could not be added!');
                        })

                    }

                }
            }).then(function (modal) {
                modal.element.modal();
                modal.close.then(function () {

                })
            })

        }

        $scope.deleteaward = function (id) {

            $http({
                method: 'POST',
                url: $rootScope.apiUrl + 'admin/award/delete',
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                },
                params: {
                    award_id: id
                }
            }).then(function (response) {
                if(response.data.status == 'success') {
                    $http({
                        method: 'GET',
                        url: $rootScope.apiUrl + 'admin/awards',
                        headers: {
                            'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                        },
                        params: {
                            from: 0,
                            take: $scope.take
                        }
                    }).then(function (response) {
                        $scope.awards = response.data.data;
                    }, function (error) {
                    })
                }
            }, function (error) {
                alert('Could not delete the award! Please try again.');
            })

        }

        $scope.editAward = function (award) {

            ModalService.showModal({
                templateUrl: 'modals/awardinfo.html',
                controller: function ($scope, $http, $element, award, close) {
                    $scope.cancel = function() {
                        $element.modal('hide');
                        close({
                        }, 500); // close, but give 500ms for bootstrap to animate
                    }

                    $scope.award = award;

                    $scope.edititem = function (itemid) {



                    }

                },
                inputs: {
                    award: award
                }
            }).then(function (modal) {
                modal.element.modal();
                modal.close.then(function () {

                })
            })

        }

    })
    .controller('siteContentCtrl', function ($scope, $rootScope, $state, $http, ModalService, fileUpload) {

        $scope.tandc = '';

        $scope.uploadLeftBanner = function(){
            var file = $scope.left_banner;

            var namearray = file.name.split('.');

            file.name = 'left_banner.' + namearray[namearray.length - 1];
            console.dir(file.name);

            var uploadUrl = "http://54.186.246.183/draft_buddies_beta/public/api/admin/upload";
            fileUpload.uploadFileToUrl(file, uploadUrl, 'left_banner');
        };
        $scope.uploadRightBanner = function(){
            var file = $scope.right_banner;

            var namearray = file.name.split('.');

            file.name = 'right_banner.' + namearray[namearray.length - 1];
            console.dir(file.name);

            var uploadUrl = "http://54.186.246.183/draft_buddies_beta/public/api/admin/upload";
            fileUpload.uploadFileToUrl(file, uploadUrl, 'right_banner');
        };

        $scope.options = {
            height: 300,
            focus: true,
            toolbar: [
                ['edit',['undo','redo']],
                ['headline', ['style']],
                ['style', ['bold', 'italic', 'underline', 'superscript', 'subscript', 'strikethrough', 'clear']],
                ['fontface', ['fontname']],
                ['textsize', ['fontsize']],
                ['alignment', ['ul', 'ol', 'paragraph', 'lineheight']],
                ['height', ['height']],
                ['table', ['table']],
                ['insert', ['link','hr']],
                ['view', ['fullscreen', 'codeview']],
                ['help', ['help']]
            ]
        };

        $http({
            method: 'GET',
            url: $rootScope.apiUrl + 'pages',
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
            },
            params: {
                name: 'tandc,policy',
            }
        }).then(function (response) {

            $scope.tandc = response.data.data.tandc;
            $scope.policy = response.data.data.policy;

        }, function (error) {
        })

        $scope.updatetandc = function () {

            $http({
                method: 'POST',
                url: $rootScope.apiUrl + 'admin/page',
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                },
                params: {
                    name: 'tandc',
                    text: $scope.tandc
                }
            }).then(function (response) {

                if(response.data.status == 'success') {
                    alert('Terms and conditions have been successfully updated!');
                }

            }, function (error) {
                alert('Terms and conditions could not be updated!');
            })

        }
        $scope.updatepolicy = function () {

            $http({
                method: 'POST',
                url: $rootScope.apiUrl + 'admin/page',
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                },
                params: {
                    name: 'policy',
                    text: $scope.policy
                }
            }).then(function (response) {

                if(response.data.status == 'success') {
                    alert('Privacy policy has been successfully updated!');
                }

            }, function (error) {
                alert('Privacy policy could not be updated!');
            })

        }

    })
    .controller('adminLoginCtrl', function ($scope, $rootScope, $state, $http) {

        $scope.creds = {};

        $scope.adminlogin = function () {

            $http.post($rootScope.apiUrl + 'login/web', $scope.creds)
                .then(function (response) {
                    if(response.data.status == 'success') {
                        sessionStorage.setItem('admin_token', response.data.token);
                        sessionStorage.setItem('token_type', response.data.Bearer);
                        sessionStorage.setItem('refresh_token', response.data.refresh_token);

                        $rootScope.userdata = {
                            user_token: response.data.token,
                            token_type: response.data.Bearer,
                            refresh_token: response.data.refresh_token
                        }
                        $rootScope.adminloggedin = true;
                        sessionStorage.setItem('adminloggedin', true);
                        $state.go('admin.users');
                    }
                    else {
                        alert('Could not login! Please check your credentials and try again.')
                    }
                }, function (error) {

                })

        }

    })
    .controller('adminContestsCtrl', function ($scope, $rootScope, $state, $http) {

        $scope.contests = [];
        $scope.leagues = [];

        $http({
            method: 'GET',
            url: $rootScope.apiUrl + 'contest',
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
            }
        }).then(function (response) {
            $scope.contests = response.data.data;
        }, function (error) {
        })

        $http({
            method: 'GET',
            url: $rootScope.apiUrl + 'competitions',
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
            }
        }).then(function (response) {
            $scope.leagues = response.data.data;
        }, function (error) {
        })

        $scope.clearFilters = function () {
            $scope.filter = {
                fee: {
                    min: 1,
                    max: 1000
                },
                entrants: {
                    min: 2,
                    max: 100000
                }
            }
        }

    })
    .controller('adminCreateContestCtrl', function ($rootScope, $scope, $http, $state) {

        $scope.leagues = [];
        $scope.dates = [];
        $scope.matches = [];
        $scope.days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        $scope.startdate = new Date();
        $scope.startdate.setDate($scope.startdate.getUTCDate() + 1);
        $scope.enddate = new Date();
        $scope.enddate.setDate($scope.startdate.getUTCDate() + 6);

        for(var d = $scope.startdate; d < $scope.enddate; d.setDate(d.getUTCDate() + 1)) {
            $scope.dates.push(new Date(d));
        }

        $scope.today = new Date();

        $scope.contest = {
            competition_id: '',
            match_date: $scope.today.toDateString(),
            type: ''
        }

        $http({
            method: 'GET',
            url: $rootScope.apiUrl + 'competitions',
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
            }
        }).then(function (response) {
            $scope.leagues = response.data.data;
        }, function (error) {
        })

        $scope.contestfields = {
            gamePick: '',
            league: '',
            matches: [],
            entrants: 0,
            fee: 0,
            contestType: 'public'
        }

        $scope.set2Entrants = function () {
            if($scope.contest.type == 'pick_2') {
                $scope.contest.entrants = 2;
                $scope.contest.award_id = 1;
            }
        }

        $scope.set5Entrants = function () {
            if($scope.contest.type == 'pick_8') {
                $scope.contest.entrants = 5;
            }
        }

        $scope.getMatches = function () {
            $http({
                method: 'GET',
                url: $rootScope.apiUrl + 'matches',
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                },
                params: $scope.contest
            }).then(function (response) {
                $scope.matches = response.data.data;
            }, function (error) {
            })
        }

        $scope.createContest = function () {
            $http({
                method: 'POST',
                url: $rootScope.apiUrl + 'contest',
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
                },
                params: $scope.contest
            }).then(function (response) {
                if(response.data.status == 'success') {
                    alert('Your contest was successfully created!');
                }
                else {
                    alert('Something went wrong. Please try again.');
                }
            }, function (error) {
                alert('Could not create your contest! Please try again.');
            })
        }

    })