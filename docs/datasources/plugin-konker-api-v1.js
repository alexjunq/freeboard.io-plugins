// # Konker Platform - Freeboard Datasource Plugin

(function() {
    // ## A Datasource Plugin
    //
    // -------------------
    // ### Datasource Definition
    //
    // -------------------
    freeboard
            .loadDatasourcePlugin({
                "type_name" : "konker",
                "display_name" : "Konker Platform",
                "description" : "Konker Platform Datasource",
                //"external_scripts" : [ "https://" ],
                "settings" : [ {
                    "name"          : "client_id",
                    "display_name"  : "Username",
                    "type"          : "text",
                    "default_value" : "",
                    "description"   : "Your Konker Platform Username (usually your email)",
                    "required"      : true
                }, {
                    "name"          : "client_secret",
                    "display_name"  : "Password",
                    "type"          : "text",
                    "default_value" : "",
                    "description"   : "Your password",
                    "required"      : true
                }, {
                    "name"          : "host",
                    "display_name"  : "URL",
                    "type"          : "text",
                    "default_value" : "https://api.demo.konkerlabs.net",
                    "description"   : "API URL",
                    "required"      : true
                }, {
                    "name"          : "applicationName",
                    "display_name"  : "Application",
                    "type"          : "text",
                    "default_value" : "",
                    "description"   : "(optional) Application Name",
                    "required"      : false
                }, {
                    "name"          : "deviceId",
                    "display_name"  : "Device ID",
                    "type"          : "text",
                    "default_value" : "",
                    "description"   : "(optional) Device ID",
                    "required"      : false
                }, {
                    "name"          : "eventType",
                    "display_name"  : "Event Type",
                    "type"          : "option",
                    "options"       : [
                        {
                            "name" : "Incoming",
                            "value": "incomingEvents"
                        },
                        {
                            "name" : "Outgoing",
                            "value": "outgoingEvents"
                        }
                    ],
                    "required"      : true
                }, {
                    "name"          : "refresh_time",
                    "display_name"  : "Refresh Time",
                    "type"          : "text",
                    "description"   : "In milliseconds",
                    "default_value" : 15000
                }
                ],

                newInstance : function(settings, newInstanceCallback, updateCallback) {
                    newInstanceCallback(new konkerDatasourcePlugin(settings, updateCallback));
                }
            });

    // ### Datasource Implementation
    //
    // -------------------
    var konkerDatasourcePlugin = function(settings, updateCallback) {

        // Always a good idea...
        var self = this;

        // Good idea to create a variable to hold on to our settings, because they might change in the future. See below.
        var currentSettings = settings;
        var token = null;
        var deviceGuid = null;

        function getToken() {

            if (token === null) {

                var extractToken = function(hash) {
                    var match = hash.match(/access_token=(\w+)/);
                    return !!match && match[1];
                };

                var authHost  = currentSettings.host + "/v1/oauth/token";
                var authUrl   = "?grant_type=client_credentials" +
                                "&client_id="     + currentSettings.client_id +
                                "&client_secret=" + currentSettings.client_secret;

                $.ajax({
                    url   : authHost + authUrl,
                    type  : 'GET',
                    async : false,
                    beforeSend : function(xhr) {
                        xhr.setRequestHeader("Content-Type",
                                "application/x-www-form-urlencoded");
                    },
                    success : function(response) {
                        token = response.access_token;
                    }
                });

            }

            return token;

        }

        function getDeviceGuid() {

            if (deviceGuid === null || deviceGuid === '') {
                if (settings.deviceId !== null && settings.deviceId !== '') {

                    var currentToken = getToken();
                    var applicationName = getApplicationName();

                    $.ajax({
                        url: currentSettings.host + '/v1/' + applicationName + '/devices/',
                        type: 'GET',
                        async: false,
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader('Authorization', 'Bearer ' + currentToken);
                        },
                        success: function (response) {
                            if (response.code === 200) {
                                $.each(response.result, function(index, item) {
                                    if (item.id === settings.deviceId) {
                                        deviceGuid = item.guid;
                                    }
                                });
                            }
                        }
                    });

                }
            }

            return deviceGuid;

        }

        function getApplicationName() {

            if (currentSettings.applicationName === null || currentSettings.applicationName === '') {

                var currentToken = getToken();

                $.ajax({
                    url: currentSettings.host + '/v1/applications/',
                    type: 'GET',
                    async: false,
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader('Authorization', 'Bearer ' + currentToken);
                    },
                    success: function (response) {
                        if (response.code === 200) {
                            currentSettings.applicationName = response.result[0].name;
                        }
                    }
                });

            }

            return currentSettings.applicationName;

        }

        function getData() {

            var currentToken = getToken();
            var applicationName = getApplicationName();
            var deviceGuid = getDeviceGuid();
            var apiUrl = currentSettings.host + '/v1/' + currentSettings.applicationName + '/' + currentSettings.eventType + '?sort=newest&limit=1';

            if (deviceGuid !== null && deviceGuid !== '') {
                apiUrl = apiUrl + '&q=device:' + deviceGuid;
            }

            $.ajax({
                url: apiUrl,
                type: 'GET',
                async: false,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + currentToken);
                },
                success: function (response) {
                    if (response.code === 200) {
                        var newData = [];

                        if (response.result.length > 0) {
                            newData.push({
                                "date"    : new Date(response.result[0].timestamp),
                                "payload" : response.result[0].payload
                            });

                            updateCallback(newData);
                        }
                    }
                }
            });

        }

        var refreshTimer;

        function createRefreshTimer(interval) {
            if (refreshTimer) {
                clearInterval(refreshTimer);
            }

            refreshTimer = setInterval(function() {
                getData();
            }, interval);
        }

        // A public function we must implement that will be called when a user
        // makes a change to the settings.
        self.onSettingsChanged = function(newSettings) {
            currentSettings = newSettings;
        }

        // A public function we must implement that will be called when the user wants to manually refresh the datasource
        self.updateNow = function() {
            getData();
        }

        // A public function we must implement that will be called when this instance of this plugin is no longer needed. Do anything you need to cleanup after yourself here.
        self.onDispose = function() {
            clearInterval(refreshTimer);
            refreshTimer = undefined;
        }

        createRefreshTimer(currentSettings.refresh_time);

    }

}());
