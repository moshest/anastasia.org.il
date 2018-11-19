$(function() {
	$('[data-toggle="tooltip"]').tooltip();
	
	// header scroll
	$(window).bind('scroll.header', function() {
		var pos = $(window).width() > 768 ? 70 : -1;
		$('body').toggleClass('header-fixed', $(window).scrollTop() > pos);
	})
	.trigger('scroll.header');
	
	$(window).bind('resize.header', function() {
		$(window).trigger('scroll.header');
	});
	
	$('#side-nav').affix({
		offset: {
			top: 100,
			bottom: function () {
			  return (this.bottom = 120 
					  + $('#footer').outerHeight(true) 
					  + $('#social').outerHeight(true));
			}
		}
	});
	
	
	// datepicker
	$('[data-toggle="datepicker"]').each(function() {
		var elm = $(this);
			
		elm.datepicker($.extend({
			dateFormat: 'dd/mm/yy',
			closeText: 'סגור',
			prevText: '&#x3C;הקודם',
			nextText: 'הבא&#x3E;',
			currentText: 'היום',
			monthNames: ['ינואר','פברואר','מרץ','אפריל','מאי','יוני',
					'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'],
			monthNamesShort: ['ינו','פבר','מרץ','אפר','מאי','יוני',
					'יולי','אוג','ספט','אוק','נוב','דצמ'],
			dayNames: ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'],
			dayNamesShort: ['א\'','ב\'','ג\'','ד\'','ה\'','ו\'','שבת'],
			dayNamesMin: ['א\'','ב\'','ג\'','ד\'','ה\'','ו\'','שבת'],
			isRTL: true
		}, elm.data()));
	});
	

	// form validate
	$('form[data-validate="true"]').on('submit', function(e, force) {
		if(force) {
			$(this).find(':submit')
					.attr('autocomplete', 'off')
					.prop('disabled', true);
			return;
		}

		e.preventDefault();

		var self = this;
		$(self).validateForm(function(err) {
			if(!err) {
				$(self).trigger('submit', [true]);
			}
		});
	});
});

function setupChat(chatRoom, chatTime, messages) {
	ion.sound({
		sounds: [{name: 'water_droplet_3'}],
		volume: 0.2,
		path: '/static/libs/ion.sound-3.0.4/sounds/',
		preload: true
	});
	
	angular.module('chatApp', ['angularMoment'])
	.run(function(amMoment) {
		amMoment.changeLocale('he');
	})
	.controller('ChatController', function($scope, $element, $sce) {
		var self = this;

		var orgTitle = document.title;
		var notifs = 0;
		var page = 1;
		
		var event = 'chat ' + chatRoom;
		var socket = io();
		
		var messagesList = $($element.find('.chat-messages'));
		for(var i in messages) {
			messages[i].trustHtml = $sce.trustAsHtml(messages[i].html);
		}
		
		self.entered = false;
		self.messages = messages;
		
		self.blur = false;
		
		$(window).bind('blur', function() {
			self.blur = true;
		});
		
		$(window).bind('focus', function() {
			self.blur = false;
			
			notifs = 0;
			document.title = orgTitle;
		});
		
		self.loadMore = function() {
			$($element.find('.load-more')).hide();
			
			$.ajax({
				data: {
					page: page,
					chatTime: chatTime
				},
				success: function(messages) {
					if(!messages.length)
							return;
						
					$scope.$apply(function() {
						page++;
						for(var i in messages) {
							messages[i].trustHtml = $sce.trustAsHtml(messages[i].html);
							self.messages.unshift(messages[i]);
						}
					});
					
					$($element.find('.load-more')).show();
				},
				error: function() {
					$($element.find('.load-more')).show();
				}
			})
		}
		
		self.notify = function() {
			if(!self.blur)
				return;
			
			notifs++;
			document.title = '(' + notifs + ') ' + orgTitle;
			
			ion.sound.play('water_droplet_3');
		};
		
		self.enter = function() {
			if(!self.name.match(/^[a-zא-ת]{2,}( [a-zא-ת]{2,})*$/i)) {
				alert('הכנס שם חוקי');
				return;
			}
			
			self.entered = true;
		};
		
		self.exit = function() {
			self.entered = false;
		};
		
		self.isScrollDown = function() {
			return Math.abs(messagesList.scrollTop() - self.getScrollTopMax()) < 10;
		};
		
		self.getScrollTopMax = function() {
			return Math.floor(messagesList.prop('scrollHeight') - messagesList.innerHeight());
		};
		
		self.scrollDown = function() {
			messagesList.stop(true).animate({
				scrollTop: self.getScrollTopMax() + 100
			});
		};
		
		$scope.$$postDigest(function(){
			self.scrollDown();
		});
		
		self.send = function() {
			if(!self.msg.match(/\S/))
				return;
				
			var msg = {
				name: self.name,
				content: self.msg,
				time: new Date()
			};
			
			self.msg = '';
			self.scrollDown();
			
			socket.emit(event, msg);
		};

		socket.on(event, function(msg) {
			var isScrollDown = self.isScrollDown();
			
			$scope.$apply(function() {
				msg.trustHtml = $sce.trustAsHtml(msg.html);
				self.messages.push(msg);
			
				if(isScrollDown) {
					$scope.$$postDigest(function(){
						self.scrollDown();
					});
				}
			});
			
			self.notify();
		});
	});
};

	
$.fn.validateForm = function(partial, callback) {
	$(this).each(function() {
		if(typeof partial === 'function') {
			callback = partial;
			partial = false;
		}
		if(!callback)
			callback = $.noop;

		var form = $(this);
		var data = partial;

		if(typeof data !== 'string' && typeof data !== 'object')
			data = form.serialize();
		
		form.find('.form-control.popover-error,input.popover-error')
		.trigger('change.popover-error');

		form.find('.form-group.has-error,.checkbox.has-error,label.has-error')
		.removeClass('has-error');

		$.ajax({
			type: form.attr('method') || 'get',
			url: form.attr('action'),
			headers: {
				'Ajax-Validator': 'true'
			},
			data: data,
			dataType: 'json',
			success: function(errors) {
				if(!errors)
					return callback(null);

				if(!Array.isArray(errors)) {
					callback(new Error('Unexpected result.'));
					return;
				}
				
				var count = 0;

				for(var i in errors) {
					var error = errors[i],
					control = form.find('.form-control[name="' + error.param + '"],input[name="' + error.param + '"]'),
					group = control.closest('.form-group,.checkbox');
			
					if(group.length) {
						group.addClass('has-error');
					} else {
						form.find('label[for="' + error.param + '"]').addClass('has-error');
						
						if(!control.length)
							continue;
					}

					if((partial && !error.value) || !error.msg)
						continue;
					
					control.one('change.popover-error', function() {
						group.removeClass('has-error');
						control.removeClass('popover-error').popover('destroy');
					})
					.addClass('popover-error')
					.popover({
						content: error.msg,
						placement: control.data('errorPlacement') || 'bottom',
						trigger: 'focus'
					});
					
					if(!count) {
						control.popover('show');
						
						$('html, body').animate({
							scrollTop: control.offset().top - 200
						}, 200);
					}
					
					count++;
				}

				callback(errors);
			},
			error: function(err) {
				callback(err || -1);
			}
		});
	});
};