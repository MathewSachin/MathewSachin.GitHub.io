# frozen_string_literal: true

require 'nokogiri'

module ContentAdSplitMarkers
  TARGET_SELECTOR = 'p, h2, h3, h4, h5, h6, picture, figure, table'

  def inject_ads_between_content_blocks(html, ad_html, density = 5)
    return html if html.nil? || html.empty?
    return html if ad_html.nil? || ad_html.empty?

    n = density.to_i
    return html if n <= 0

    fragment = Nokogiri::HTML::DocumentFragment.parse(html)
    targets = fragment.css(TARGET_SELECTOR)
    return html if targets.empty?

    targets.each_with_index do |node, idx|
      next unless ((idx + 1) % n).zero?

      ad_nodes = Nokogiri::HTML::DocumentFragment.parse(ad_html).children.map(&:dup)
      next if ad_nodes.empty?

      cursor = node
      ad_nodes.each do |ad_node|
        cursor.add_next_sibling(ad_node)
        cursor = ad_node
      end
    end

    fragment.to_html
  end
end

Liquid::Template.register_filter(ContentAdSplitMarkers) if defined?(Liquid::Template)
