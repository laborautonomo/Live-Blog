 define([
    'jquery', 
    'gizmo/superdesk',
    'angular',
    config.guiJs('livedesk', 'seo-config'),
    config.guiJs('livedesk', 'localization-config'),
    config.guiJs('livedesk', 'views/languages'),
    config.guiJs('livedesk', 'views/blogtypes'),
    config.guiJs('livedesk', 'views/configure/themes'),
    config.guiJs('livedesk', 'views/configure/api-keys'),
    'gizmo/superdesk/action',
    config.guiJs('livedesk', 'models/blog'),
    config.guiJs('livedesk', 'models/general-settings'),    
    config.guiJs('media-archive', 'upload'),
    config.guiJs('media-archive', 'adv-upload'), 
    'tmpl!livedesk>layouts/livedesk',
    'tmpl!core>layouts/footer',
    'tmpl!core>layouts/footer-static',
    'tmpl!core>layouts/footer-dinamic',
    'tmpl!livedesk>configure',
    'tmpl!livedesk>configure/languages',
    'tmpl!livedesk>providers/edit/imagelink',
], function( $, Gizmo, angular, SeoConfig, LocalizationConfig, LanguagesView, BlogTypesView, ThemesView, ApiKeysView, Action, BlogModel, GeneralSettings, uploadCom, UploadView ) {
   var uploadView = new UploadView({thumbSize: 'large'});
   return Gizmo.View.extend({
        events: {
            '[data-action="save"]': { 'click': 'save' },
            '[data-action="save-close"]': { 'click': 'saveClose' },
            '[data-action="cancel"]': { 'click': 'close' },
            '[name="Language"]': { change: 'changeLanguage' },
            '[name="FrontendServer"]': { focusout: 'changeFrontendServer', keydown: 'keydownFrontendServer' },
            '[name="EmbedSwitch"]': { change: 'switchEmbed' },
            '[name="ProviderLink"]': { click: 'selectInput', focusIn: 'selectInput' },
            "[data-toggle='modal-image']": { 'click': 'openUploadScreen' }
        },
        init: function() {
            var self = this;
            self.generalSettings = Gizmo.Auth(new Gizmo.Register.GeneralSettings());
            self.dfdGeneralSettings =
            self.generalSettings.param('frontend','group')
                .xfilter('Value,Key')
                .sync();
            $(uploadView).on('complete', function(){
                self.handleImageUpload();
            });
        },
        handleImageUpload: function(imgData) {
            var self = this;
            var imgData = uploadView.getRegisteredItems();
            var myData = false;
            for ( var propName in imgData) {
                myData = imgData[propName].data;
                break;
            }
            if (myData) {
                self.el.find('[name="MediaImage"]').val(myData.Content.href);
                $.tmpl('livedesk>providers/edit/imagelink' , {fullimg: myData.Content.href, thumbimg:myData.Thumbnail.href}, function(e,o) {
                    self.el.find('#MediaImageThumb').html(o);
                });
            }
        },
        handleImageUpload: function(imgData) {
            var self = this;
            if (imgData.length) {
                var myData = imgData[0].data;
                self.el.find('[name="MediaImage"]').val(myData.Content.href);
                $.tmpl('livedesk>providers/edit/imagelink' , {fullimg: myData.Content.href, thumbimg:myData.Thumbnail.href}, function(e,o) {
                    self.el.find('#MediaImageThumb').html(o);
                });
            }
        },
        openUploadScreen: function() {
            var self = this;
            uploadView.activate().then(function(data) {
                self.handleImageUpload(data);
            });
        },
        selectInput: function(evt) {
			$(evt.target).select();
		},
        save: function(evt){
            var self = this;
            // make mediaUrl a global url in case it is not
            var mediaUrl = self.el.find('[name="MediaUrl"]').val();
            if ( mediaUrl.indexOf("http://") != 0 && mediaUrl.indexOf("https://") != 0 && mediaUrl.indexOf("//") != 0 ) {
                mediaUrl = "//" + mediaUrl;
            }

            //trigger save for seoconfig
            var angScope = angular.element($('[name="seoAngular"]')).scope();
            angScope.saveAllConfigs();

            var EmbedConfig = {
                    'theme': self.el.find('[name="Theme"]').val(),
                    'FrontendServer': self.el.find('[name="FrontendServer"]').val(),
                    'MediaImage': self.el.find('[name="MediaImage"]').val(),
                    'VerificationToggle': self.el.find('[name="VerificationToggle"]:checked').val(),
                    'MediaToggle': self.el.find('[name="MediaToggle"]').is(':checked'),
                    'MediaUrl': mediaUrl,
                    'UserComments': self.el.find('[name="UserComments"]').is(':checked'),
                    'EmbedSwitch': self.el.find('[name="EmbedSwitch"]').is(':checked')
                },
                data = {
                    Language: self.el.find('[name="Language"]').val(),
                    Type: self.el.find('[name="blogtypeselection"]:checked').val(),
                    EmbedConfig: JSON.stringify(EmbedConfig)
                };
            self.apiKeysView.save();
			self.model.off('update');
            return self.model.set(data).sync();
        },
        saveClose: function(evt) {
            var self = this;
            self.save().done(function() {
                self.close();
            });
        },
        close: function() {
            Backbone.history.navigate('live-blog/' + this.model.get('Id'), true);
        },
        refresh: function() {
            var self = this;
            self.model = Gizmo.Auth(new Gizmo.Register.Blog(self.theBlog));
            self.model
                .one('read update', self.render, self)
                .sync();
        },
        changeFrontendServer: function(evt){
            this.themesView.change(evt);
        },
        switchEmbed: function(evt) {
            var checked = $(evt.target).closest('[name="EmbedSwitch"]').is(':checked');
            this.themesView.changeTmpl(checked);
        },
        keydownFrontendServer: function(e){
            var code = (e.keyCode ? e.keyCode : e.which);
             if(code == 13) {
                e.preventDefault();
                this.themesView.change(e);
            } 
        },
        changeLanguage: function(evt) {
           this.themesView.change(evt); 
        },

        render: function() {
            var embedConfig = this.model.get('EmbedConfig');
            if((embedConfig !== undefined) && $.isString(embedConfig)) {
                this.model.data['EmbedConfig'] = JSON.parse(this.model.get('EmbedConfig'));
            } else if(embedConfig === undefined){
                this.model.data['EmbedConfig'] = {};
            }
            var self = this,
                themesData,
                data = $.extend({}, self.model.feed(), {
                    BlogHref: self.theBlog,
                    BlogId: self.model.get('Id'),
                    ui: {
                        content: 'is-content=1',
                        side: 'is-side=1',
                        submenu: 'is-submenu',
                        submenuActive2: 'active'
                    }
                });
            embedConfig = this.model.get('EmbedConfig');
            if(!embedConfig.FrontendServer || embedConfig.FrontendServer == ''){
                embedConfig.FrontendServer = config.api_url;
            }
            if(this.model.href.indexOf(config.api_url) !== -1 ) {
                data["OutputLink"] = this.model.href.replace(config.api_url, embedConfig.FrontendServer);
            }
            else {
                data["OutputLink"] = embedConfig.FrontendServer + this.model.href;
            }
            data["ProviderLink"] = data["OutputLink"].split('/').slice(0,-1).join('/');
            $.superdesk.applyLayout('livedesk>configure', data, function() {
            //$.tmpl('livedesk>configure', self.model.feed(), function(e, o){
                //self.el.html(o);
                self.languagesView = new LanguagesView({
                    tmpl: 'livedesk>configure/languages',
                    el: self.el.find('.languages'),
                    _parent: self,
                    tmplData: { selected: self.model.get('Language').get('Id')}
                });
                self.blogtypesView = new BlogTypesView({
                    el: self.el.find('.blogtypes'),
                    _parent: self,
                    theBlog: self.theBlog,
                    tmplData: { selected: self.model.get('Type').get('Id') }
                });
                self.apiKeysView = new ApiKeysView({
                    el: self.el.find('.api-keys'),
                    _parent: self,
                    theBlog: self.theBlog
                });
                themesData = {
                    el: self.el.find('.themes'),
                    _parent: self,
                    theBlog: self.theBlog
                };
                if(self.model.get('EmbedConfig')) {
                    //embedConfig = self.model.get('EmbedConfig');
                    themesData.tmplData = { selected: embedConfig.theme };
                } 
                self.themesView = new ThemesView(themesData);
                // TODO: move this in emebed view or in theme view
                self.el.find('#emebed-script').focus(function() { $(this).select(); } );

                angular.bootstrap(document.getElementById('seo'), ['seoConf']);
                angular.bootstrap(document.getElementById('localization'), ['localizationConf']);
                var angScope = angular.element($('[name="seoAngular"]')).scope();
                self.dfdGeneralSettings.done(function(){
                    self.generalSettings.each(function(idx, model){
                        if(model.get('Key') === 'embed-type') {
                            self.el.find('[name="EmbedSwitch"]').prop('checked', 
                                model.get('Value')==='simple');
                        }
                    });
                    // @TODO LB-1985: use a selector if needed in the future
                    // var checked = self.el.find('[name="EmbedSwitch"]').is(':checked');
                    // self.themesView.changeTmpl(checked);
                    self.themesView.change();                    
                });
                /* sf-toggle*/
                self.el.find('.sf-toggle').each(function(i,val){
                    var additional_class="";
                    if ($(val).attr("checked")=="checked")  additional_class += " sf-checked ";
                    if ($(val).hasClass("on-off")) additional_class +=" on-off-toggle ";
                    if ($(val).hasClass("sf-disable")) additional_class += " sf-disable ";
                    $(val).wrap('<div style="float:none" class="sf-toggle-custom ' + additional_class + '"><div class="sf-toggle-custom-inner"></div></div>');
                    $(val).hide();

                    $(val).parent().parent().on("click", function(e){
                        e.preventDefault();                        
                        if (!$(e.target).hasClass("sf-disable")) {
                            var correctTarget = $(e.target);
                            if ( $(e.target).hasClass("sf-toggle-custom-inner") ) {
                                correctTarget = $(e.target).parent();
                            }
                            correctTarget.toggleClass('sf-checked');
                            var own_box = correctTarget.find(".sf-toggle");        
                            own_box.prop('checked', correctTarget.hasClass('sf-checked'));
                            own_box.change();
                        }
                    });
                });
            });
            $.superdesk.hideLoader();
        }
    });
});
