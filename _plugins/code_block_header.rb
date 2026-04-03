# frozen_string_literal: true

# Jekyll plugin: inject code block headers (language label + copy button) at build time.
#
# Finds every <div class="highlight"> block in generated HTML and prepends
# a header div containing the detected language name and a copy button.
# This removes the need to construct the DOM at runtime in copy-code.js.

require 'nokogiri'

Jekyll::Hooks.register [:pages, :posts, :documents], :post_render do |doc|
  next unless doc.output_ext == '.html'
  next unless doc.output.include?('class="highlight"')

  parsed = Nokogiri::HTML(doc.output)
  counter = 0

  parsed.css('div.highlight').each do |block|
    pre = block.at_css('pre')
    next unless pre

    counter += 1
    id = "code-block-#{counter}"
    pre['id'] = id

    code_el = block.at_css('code')
    parent = block.parent
    code_class = code_el ? (code_el['class'] || '') : ''
    parent_class = parent ? (parent['class'] || '') : ''

    lang_match = code_class.match(/language-(\w+)/) || parent_class.match(/language-(\w+)/)
    lang = lang_match ? lang_match[1] : ''

    lang_span = Nokogiri::XML::Node.new('span', parsed)
    lang_span['class'] = 'code-lang' unless lang.empty?
    lang_span.content = lang

    icon = Nokogiri::XML::Node.new('i', parsed)
    icon['class'] = 'fa fa-copy'
    icon['aria-hidden'] = 'true'

    copy_btn = Nokogiri::XML::Node.new('button', parsed)
    copy_btn['class'] = 'btn btn-sm btn-clip'
    copy_btn['title'] = 'Copy to clipboard'
    copy_btn['data-clipboard-target'] = "##{id}"
    copy_btn['aria-label'] = 'Copy code to clipboard'
    copy_btn.add_child(icon)

    header = Nokogiri::XML::Node.new('div', parsed)
    header['class'] = 'code-block-header d-flex align-items-center justify-content-between px-3 py-1'
    header.add_child(lang_span)
    header.add_child(copy_btn)

    block.prepend_child(header)
  end

  doc.output = parsed.to_html
end
