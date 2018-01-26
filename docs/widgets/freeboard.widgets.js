// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ F R E E B O A R D                                                  │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright © 2013 Jim Heising (https://github.com/jheising)         │ \\
// │ Copyright © 2013 Bug Labs, Inc. (http://buglabs.net)               │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// └────────────────────────────────────────────────────────────────────┘ \\

(function () {

    var waterTankID = 0;
//	freeboard.addStyle('.gauge-widget-wrapper', "width: 100%;text-align: center;");
//	freeboard.addStyle('.gauge-widget', "width:200px;height:160px;display:inline-block;");

    var waterTankWidget = function (settings) {
        var self = this;

        var thisGaugeID = "watertank-" + waterTankID++;
        console.log('ID = ' + thisGaugeID);
        var titleElement = $('<h2 class="section-title"></h2>');
        var gaugeElement = $('<div class="watertank-widget" id="' + thisGaugeID + '" style="width:200px;height:200px;"></div>');

        var gaugeObject;
        var rendered = false;

        var currentSettings = settings;

        if (settings.tank_type == null) {
            currentSettings.tank_type = 'tower';
        }

        var thresholds = [
          {
            name: 'Alarm High',
            value: 90,
            type: 'High',
            alarm: true
          },
          {
            name: 'Alarm Low',
            value: 10,
            type: 'Low',
            alarm: true
          }
        ];


        var options = {
          tankType: currentSettings.tank_type,
          fillValue: 55,
          fillUnit: "%",
          supportLabelPadding: 5,
          frontFontColor: "#003B42",
          thresholds: thresholds,
          lookupTableValue: 500,
          lookupTableValueUnit: 'litros',
          lookupTableValueDecimal: 0,
          changeRateValueEnabled:false,
          //changeRateValueArrowEnabled: true,
          //changeRateValue: 0.0,
          //changeRateValueDecimal: 2,
          //changeRateValueUnit: 'l/min',
        }


        function createGauge() {
            if (!rendered) {
                return;
            }

            gaugeElement.empty();

            console.log('gauge id = '+ thisGaugeID );
            console.log($('#'+thisGaugeID));

            gaugeObject = $('#'+thisGaugeID).analogTank(options);

            /*

            gaugeObject = new JustGage({
                id: thisGaugeID,
                value: (_.isUndefined(currentSettings.min_value) ? 0 : currentSettings.min_value),
                min: (_.isUndefined(currentSettings.min_value) ? 0 : currentSettings.min_value),
                max: (_.isUndefined(currentSettings.max_value) ? 0 : currentSettings.max_value),
                label: currentSettings.units,
                showInnerShadow: false,
                valueFontColor: "#d3d4d4"
            });

            */
        }

        this.render = function (element) {
            rendered = true;
            $(element).append(titleElement).append($('<div class="gauge-widget-wrapper"></div>').append(gaugeElement));
            createGauge();
        }

        this.onSettingsChanged = function (newSettings) {
            if (newSettings.min_value != currentSettings.min_value || 
                    newSettings.max_value != currentSettings.max_value || 
                    newSettings.units != currentSettings.units || 
                    newSettings.tank_type != currentSettings.tank_type) {
                currentSettings = newSettings;
                createGauge();
            }
            else {
                currentSettings = newSettings;
            }

            titleElement.html(newSettings.title);
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            gaugeObject.updateLookupTableValue(self.calculateAvaliableLiters(Number(newValue)));
            gaugeObject.updateHeight(self.calculateUsage(Number(newValue)));
/*
            console.log("udpate value for " + settingName);
            if (settingName == "value") {
                self.refresh(Number(newValue));
            }
            if (settingName == "total") {
                gaugeObject.updateLookupTableValue(newValue);
            }
            if (!_.isUndefined(gaugeObject)) {
                gaugeObject.refresh(Number(newValue));
            }
*/
        }

        this.calculateUsage = function (measure) {
            distance = measure
            tank_high = currentSettings.tank_height
            water_high = currentSettings.tank_water_height

            h_usage = distance - (tank_high - water_high)
            usage = 1 - h_usage/water_high

            return (usage*100)
        }

        this.calculateAvaliableLiters = function(measure) {
            distance = measure
            tank_high = currentSettings.tank_height
            water_high = currentSettings.tank_water_height
            tank_diameter = currentSettings.tank_diameter


            h_usage = distance - (tank_high - water_high)
            usage = 1 - h_usage/water_high

            radius = tank_diameter/2
            usable_liters = radius*radius*3.1415926*water_high*(usage)/1000

            return (usable_liters)
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return gaugeElement.height() / 45 - 0.5;
        }

        this.onSettingsChanged(settings);

        this.refresh = function(value) {
            console.log("new value = "+value);
            gaugeObject.updateHeight(value);
        }
    };

    freeboard.loadWidgetPlugin({
        type_name: "waterTank",
        display_name: "WaterTank",
        "external_scripts" : [
            "https://cdnjs.cloudflare.com/ajax/libs/d3/4.2.3/d3.js",
            "https://code.getmdl.io/1.2.1/material.min.js",
            "https://alexjunq.github.io/freeboard.io-plugins/widgets/water-tank.js"
        ],
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "tank_type",
                display_name: "Tank Type",
                type: "option",
                default_value: "tower",
                options: [
                    {
                        name: "Tower",
                        value: "tower"
                    },
                    {
                        name: "Round",
                        value: "round"
                    }
                ]
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },
            {
                name: "units",
                display_name: "Units",
                type: "text"
            },
            {
                name: "tank_height",
                display_name: "Tank Height",
                type: "text",
                default_value: 100
            },
            {
                name: "tank_water_height",
                display_name: "Tank Water Max Height",
                type: "text",
                default_value: 0
            },
            {
                name: "tank_diameter",
                display_name: "Tank Diameter",
                type: "text",
                default_value: 0
            },
            {
                name: "min_value",
                display_name: "Minimum",
                type: "text",
                default_value: 0
            },
            {
                name: "max_value",
                display_name: "Maximum",
                type: "text",
                default_value: 100
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new waterTankWidget(settings));
        }
    });

}());
