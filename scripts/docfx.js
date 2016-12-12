// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE file in the project root for full license information.
$(function () {
  var active = 'active';
  var expanded = 'in';
  var collapsed = 'collapsed';
  var filtered = 'filtered';
  var show = 'show';
  var hide = 'hide';

  // Update href in navbar
  (function () {
      var toc = $('#sidetoc');
      loadToc();
      
      function loadToc() {
          var tocPath = $("meta[property='docfx\\:tocrel']").attr("content");
          if (tocPath) tocPath = tocPath.replace(/\\/g, '/');
          $('#sidetoc').load(tocPath + " #sidetoggle > div", function () {
              registerTocEvents();

              var index = tocPath.lastIndexOf('/');
              var tocrel = '';
              if (index > -1) {
                  tocrel = tocPath.substr(0, index + 1);
              }
              var currentHref = getAbsolutePath(window.location.pathname);
              $('#sidetoc').find('a[href]').each(function (i, e) {
                  var href = $(e).attr("href");
                  if (isRelativePath(href)) {
                      href = tocrel + href;
                      $(e).attr("href", href);
                  }

                  if (getAbsolutePath(e.href) === currentHref) {
                      $(e).parent().addClass(active);
                      var parent = $(e).parent().parents('li').children('a');
                      if (parent.length > 0) {
                          parent.addClass(active);
                      }
                      // for active li, expand it
                      $(e).parents('ul.nav>li').addClass(expanded);

                      // Scroll to active item
                      var top = 0;
                      $(e).parents('li').each(function (i, e) {
                          top += $(e).position().top;
                      });
                      // 50 is the size of the filter box
                      $('.sidetoc').scrollTop(top - 50);
                  } else {
                      $(e).parent().removeClass(active);
                      $(e).parents('li').children('a').removeClass(active);
                  }
              });
          });
      }

      function registerTocEvents() {
          $('.toc .nav > li > .expand-stub').click(function (e) {
              $(e.target).parent().toggleClass(expanded);
          });
          $('.toc .nav > li > .expand-stub + a:not([href])').click(function (e) {
              $(e.target).parent().toggleClass(expanded);
          });
          $('#toc_filter_input').on('input', function (e) {
              var val = this.value;
              if (val === '') {
                  // Clear 'filtered' class
                  $('#toc li').removeClass(filtered).removeClass(hide);
                  return;
              }

              // Get leaf nodes
              $('#toc li>a').filter(function (i, e) {
                  return $(e).siblings().length === 0
              }).each(function (i, anchor) {
                  var text = $(anchor).text();
                  var parent = $(anchor).parent();
                  var parentNodes = parent.parents('ul>li');
                  for (var i = 0; i < parentNodes.length; i++) {
                      var parentText = $(parentNodes[i]).children('a').text();
                      if (parentText) text = parentText + '.' + text;
                  };
                  if (filterNavItem(text, val)) {
                      parent.addClass(show);
                      parent.removeClass(hide);
                  } else {
                      parent.addClass(hide);
                      parent.removeClass(show);
                  }
              });
              $('#toc li>a').filter(function (i, e) {
                  return $(e).siblings().length > 0
              }).each(function (i, anchor) {
                  var parent = $(anchor).parent();
                  if (parent.find('li.show').length > 0) {
                      parent.addClass(show);
                      parent.addClass(filtered);
                      parent.removeClass(hide);
                  } else {
                      parent.addClass(hide);
                      parent.removeClass(show);
                      parent.removeClass(filtered);
                  }
              })

              function filterNavItem(name, text) {
                  if (!text) return true;
                  if (name.toLowerCase().indexOf(text.toLowerCase()) > -1) return true;
                  return false;
              }
          });
      }
      
      function getAbsolutePath(href) {
          // Use anchor to normalize href
          var anchor = $('<a href="' + href + '"></a>')[0];
          // Ignore protocal, remove search and query
          return anchor.host + anchor.pathname;
      }

      function isRelativePath(href) {
          return !isAbsolutePath(href);
      }

      function isAbsolutePath(href) {
          return (/^(?:[a-z]+:)?\/\//i).test(href);
      }
  })();
  
  //Setup Affix
  (function () {
    var hierarchy = getHierarchy();
    if (hierarchy.length > 0) {
      var html = '<h5 class="title">In This Article</h5>'
      html += formList(hierarchy, ['nav', 'bs-docs-sidenav']);
      $("#affix").append(html);
      $('#affix').on('activate.bs.scrollspy', function (e) {
        if (e.target) {
          if ($(e.target).find('li.active').length > 0) {
            return;
          }
          var top = $(e.target).position().top;
          $(e.target).parents('li').each(function (i, e) {
            top += $(e).position().top;
          });
          var container = $('#affix > ul');
          container.scrollTop(container.scrollTop() + top - 100);
        }
      })
    }
    else
    {
      $("#articleContainer").removeClass("col-md-9");
      $("#articleContainer").addClass("col-md-12");      
    }

    function getHierarchy() {
      // supported headers are h1, h2, h3, and h4
      // The topest header is ignored
      var selector = ".article article";
      var headers = ['h4', 'h3', 'h2', 'h1'];
      var hierarchy = [];
      var toppestIndex = -1;
      var startIndex = -1;
      // 1. get header hierarchy
      for (var i = headers.length - 1; i >= 0; i--) {
        var header = $(selector + " " + headers[i]);
        var length = header.length;

        // If contains no header in current selector, find the next one
        if (length === 0) continue;

        // If the toppest header contains only one item, e.g. title, ignore
        if (length === 1 && hierarchy.length === 0 && toppestIndex < 0) {
          toppestIndex = i;
          continue;
        }

        // Get second level children
        var nextLevelSelector = i > 0 ? headers[i - 1] : null;
        var prevSelector;
        for (var j = length - 1; j >= 0; j--) {
          var e = header[j];
          var id = e.id;
          if (!id) continue; // For affix, id is a must-have
          var item = {
            name: htmlEncode($(e).text()),
            href: "#" + id,
            items: []
          };
          if (nextLevelSelector) {
            var selector = '#' + id + "~" + nextLevelSelector;
            var currentSelector = selector;
            if (prevSelector) currentSelector += ":not(" + prevSelector + ")";
            $(header[j]).siblings(currentSelector).each(function (index, e) {
              if (e.id) {
                item.items.push({
                  name: htmlEncode($(e).text()), // innerText decodes text while innerHTML not
                  href: "#" + e.id

                })
              }
            })
            prevSelector = selector;
          }
          hierarchy.push(item);
        }
        break;
      };
      hierarchy.reverse();
      return hierarchy;
    }

    function htmlEncode(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function htmlDecode(value) {
      return String(value)
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    }
  })();

  function formList(item, classes) {
    var level = 1;
    var model = {
      items: item
    };
    var cls = [].concat(classes).join(" ");
    return getList(model, cls);

    function getList(model, cls) {
      if (!model || !model.items) return null;
      var l = model.items.length;
      if (l === 0) return null;
      var html = '<ul class="level' + level + ' ' + (cls || '') + '">';
      level++;
      for (var i = 0; i < l; i++) {
        var item = model.items[i];
        var href = item.href;
        var name = item.name;
        if (!name) continue;
        html += href ? '<li><a href="' + href + '">' + name + '</a>' : '<li>' + name;
        html += getList(item, cls) || '';
        html += '</li>';
      }
      html += '</ul>';
      return html;
    }
  }
    
  // ---------------------------- Custom ------------------------------------
  $("table").addClass("table table-bordered table-striped table-condensed");  
})
