# frozen_string_literal: true

require 'spec_helper'
require 'nokogiri'

require_relative '../../_plugins/content_ad_split_markers'

RSpec.describe ContentAdSplitMarkers do
  let(:filter_host) { Class.new { include ContentAdSplitMarkers }.new }
  let(:ad_html) { '<div class="in-content-ad">Advertisement</div>' }

  describe '#inject_ads_between_content_blocks' do
    it 'injects ads after every nth target content element' do
      html = '<p>one</p><h2>two</h2><figure><img src="x"></figure><table><tr><td>x</td></tr></table>'
      result = filter_host.inject_ads_between_content_blocks(html, ad_html, 2)
      doc = Nokogiri::HTML::DocumentFragment.parse(result)

      expect(doc.css('.in-content-ad').size).to eq(2)
      expect(result).to include('</h2><div class="in-content-ad">Advertisement</div>')
      expect(result).to include('</table><div class="in-content-ad">Advertisement</div>')
    end

    it 'does not count closing-tag text inside inline script content as split points' do
      html = '<script>const s = "</p><h2>not real nodes</h2>";</script><p>real</p>'
      result = filter_host.inject_ads_between_content_blocks(html, ad_html, 1)
      doc = Nokogiri::HTML::DocumentFragment.parse(result)

      expect(doc.css('.in-content-ad').size).to eq(1)
      expect(result).to include('</script>')
      expect(result).to include('</p><div class="in-content-ad">Advertisement</div>')
    end

    it 'returns input unchanged when ad html is blank or density is invalid' do
      html = '<p>real</p>'
      expect(filter_host.inject_ads_between_content_blocks(html, '', 1)).to eq(html)
      expect(filter_host.inject_ads_between_content_blocks(html, ad_html, 0)).to eq(html)
    end

    it 'returns input unchanged for blank html values' do
      expect(filter_host.inject_ads_between_content_blocks(nil, ad_html, 1)).to be_nil
      expect(filter_host.inject_ads_between_content_blocks('', ad_html, 1)).to eq('')
    end
  end
end
