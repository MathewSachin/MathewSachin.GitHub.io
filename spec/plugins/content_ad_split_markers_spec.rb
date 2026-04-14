# frozen_string_literal: true

require 'spec_helper'
require 'nokogiri'

require_relative '../../_plugins/content_ad_split_markers'

RSpec.describe ContentAdSplitMarkers do
  let(:filter_host) { Class.new { include ContentAdSplitMarkers }.new }

  describe '#inject_ad_split_markers' do
    it 'adds markers after each target content element' do
      html = '<p>one</p><h2>two</h2><figure><img src="x"></figure><table><tr><td>x</td></tr></table>'
      result = filter_host.inject_ad_split_markers(html)

      expect(result.scan(ContentAdSplitMarkers::SPLIT_MARKER).size).to eq(4)
      expect(result).to include('</p>SPLITHERE')
      expect(result).to include('</h2>SPLITHERE')
      expect(result).to include('</figure>SPLITHERE')
      expect(result).to include('</table>SPLITHERE')
    end

    it 'does not split on closing-tag text inside inline script content' do
      html = '<script>const s = "</p><h2>not real nodes</h2>";</script><p>real</p>'
      result = filter_host.inject_ad_split_markers(html)

      expect(result.scan(ContentAdSplitMarkers::SPLIT_MARKER).size).to eq(1)
      expect(result).to include('</script>')
      expect(result).to include('</p>SPLITHERE')
    end

    it 'returns input unchanged for blank values' do
      expect(filter_host.inject_ad_split_markers(nil)).to be_nil
      expect(filter_host.inject_ad_split_markers('')).to eq('')
    end
  end
end
