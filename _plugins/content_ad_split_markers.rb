# frozen_string_literal: true

require 'nokogiri'

module ContentAdSplitMarkers
  SPLIT_MARKER = 'SPLITHERE'
  TARGET_SELECTOR = 'p, h2, h3, h4, h5, h6, picture, figure, table'

  def inject_ad_split_markers(html)
    return html if html.nil? || html.empty?

    fragment = Nokogiri::HTML::DocumentFragment.parse(html)

    fragment.css(TARGET_SELECTOR).each do |node|
      marker = Nokogiri::XML::Text.new(SPLIT_MARKER, fragment)
      node.add_next_sibling(marker)
    end

    fragment.to_html
  end
end

Liquid::Template.register_filter(ContentAdSplitMarkers)
