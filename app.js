'use strict';

// Declare app level module which depends on views, and components
var dbuddies = angular.module('dbuddies', ['ui.router', 'dbuddies.controllers', 'vxWamp', 'oc.lazyLoad', 'ngCookies', 'ngSanitize', 'angular-carousel', 'angularMoment', 'angularModalService', '720kb.socialshare', 'ngclipboard', 'ngLoadingSpinner','ngFileUpload', 'summernote']);

dbuddies.config(function ($stateProvider, $urlRouterProvider, $wampProvider) {

    var WEBSOCKET_API_URL = 'wss://webapi-stage.everymatrix.com/v2';
    var DOMAIN_PREFIX = 'http://www.draftbuddies.com';

    $wampProvider.init({
        url: WEBSOCKET_API_URL,
        realm: DOMAIN_PREFIX
    });

  $stateProvider
      .state('master', {
          url: '/master',
          abstract: true,
          views: {
              sub_member: {
                  templateUrl: 'headers/member.html',
                  controller: 'sub_memberCtrl'
              },
              sub_guest: {
                  templateUrl: 'headers/guest.html',
                  controller: 'sub_guestCtrl'
              },
              content: {
                  template: '<div ui-view></div>',
                  controller: 'masterCtrl'
              }
          }
      })
      .state('master.home', {
        url: '/home',
        templateUrl: 'views/home.html',
        controller: 'homeCtrl'
      })
      .state('master.lobby', {
          url: '/lobby',
          cache: false,
          templateUrl: 'views/lobby.html',
          controller: 'lobbyCtrl'
      })
      .state('master.mycontests', {
          url: '/mycontests',
          cache: false,
          templateUrl: 'views/mycontests.html',
          controller: 'mycontestsCtrl'
      })
      .state('master.createcontest', {
          url: '/createcontest',
          templateUrl: 'views/createcontest.html',
          controller: 'createContestCtrl'
      })
      .state('master.joincontest', {
          url: '/joincontest',
          templateUrl: 'views/joincontest.html',
          controller: 'joincontestCtrl'
      })
      .state('master.livepick8', {
          url: '/livepick8',
          templateUrl: 'views/livepick8.html',
          controller: 'livepick8Ctrl'
      })
      .state('master.about', {
        url: '/about',
        templateUrl: 'views/about.html',
        controller: 'aboutCtrl'
      })
      .state('master.referfriends', {
          url: '/referfriends',
          templateUrl: 'views/referfriends.html',
          controller: 'referFriendsCtrl'
      })
      .state('master.profile', {
          url: '/profile',
          templateUrl: 'views/profile.html',
          controller: 'profileCtrl'
      })
      .state('master.depositmethods', {
          url: '/depositmethods',
          templateUrl: 'views/deposit/methods.html',
          controller: 'depositMethodsCtrl'
      })
      .state('master.paymentconfig', {
          url: '/paymentconfig',
          templateUrl: 'views/deposit/methods.html',
          controller: 'paymentConfigCtrl'
      })
      .state('master.cardpayment', {
          url: '/cardpayment',
          templateUrl: 'views/deposit/cardpayment.html',
          controller: 'cardPaymentCtrl'
      })
      .state('admin', {
          url: '/admin',
          abstract: true,
          cache: false,
          views: {
              content: {
                  templateUrl: 'master/admin.html',
                  controller: 'adminCtrl'
              }
          }
      })
      .state('admin.users', {
          url: '/users',
          templateUrl: 'admin/users.html',
          controller: 'adminUsersCtrl'
      })
      .state('admin.players', {
          url: '/players',
          templateUrl: 'admin/players.html',
          controller: 'adminPlayersCtrl'
      })
      .state('admin.awards', {
          url: '/awards',
          templateUrl: 'admin/awards.html',
          controller: 'adminAwardsCtrl'
      })
      .state('admin.sitecontent', {
          url: '/sitecontent',
          templateUrl: 'admin/sitecontent.html',
          controller: 'siteContentCtrl'
      })
      .state('admin.contests', {
          url: '/contests',
          templateUrl: 'admin/contests.html',
          controller: 'adminContestsCtrl'
      })
      .state('admin.createcontest', {
          url: '/createcontest',
          templateUrl: 'admin/createcontest.html',
          controller: 'adminCreateContestCtrl'
      })
      .state('adminlogin', {
          url: '/adminlogin',
          views: {
              content: {
                  templateUrl: 'admin/login.html',
                  controller: 'adminLoginCtrl'
              }
          }
      })

  $urlRouterProvider.otherwise('/master/home');

})

.service('dataService', function () {

    var _data = {};
    this.data = _data;

})

.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;

            element.bind('change', function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}])

.service('fileUpload', ['$http', function ($http) {
    this.uploadFileToUrl = function(file, uploadUrl, name){
        var fd = new FormData();
        fd.append('image', file);
        fd.append('name', name);

        $http({
            method: 'POST',
            transformRequest: angular.identity,
            headers: {
                'Content-Type': undefined,
                'Authorization': 'Bearer ' + sessionStorage.getItem('admin_token')
            },
            url: uploadUrl,
            data: fd
        }).then(function (response) {
            alert('Banner had been updated!');
        }, function (error) {
            alert('Could not update the banner!');
        })
    }
}])

.run(function ($wamp, $cookies, $rootScope, $state) {
    $wamp.open();
    $cookies.putObject('wampConnection', $wamp.connection);

    $rootScope.$on( "$routeChangeStart", function(event, next, current) {
        if ( $rootScope.adminloggedin == false ) {
            if ( next.templateUrl == "admin/login.html" ) {
            } else {
                $state.go('adminlogin');
            }
        }
    });

})