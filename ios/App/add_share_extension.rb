#!/usr/bin/env ruby
# Adds a "ShareExtension" app-extension target to App.xcodeproj (idempotent).
# Run from ios/App: `ruby add_share_extension.rb`
require 'xcodeproj'

PROJECT = 'App.xcodeproj'
EXT_NAME = 'ShareExtension'
EXT_BUNDLE_ID = 'com.forkmap.app.share'

proj = Xcodeproj::Project.open(PROJECT)
app = proj.targets.find { |t| t.name == 'App' } or abort 'App target not found'

# Idempotent: remove a prior attempt so re-runs are clean.
if (existing = proj.targets.find { |t| t.name == EXT_NAME })
  puts "Removing existing #{EXT_NAME} target to re-add cleanly"
  existing.remove_from_project
end

deployment = app.build_configurations.first.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] || '15.0'
team = app.build_configurations.first.build_settings['DEVELOPMENT_TEAM']

ext = proj.new_target(:app_extension, EXT_NAME, :ios, deployment)

# Group + files (paths relative to the App.xcodeproj dir).
group = proj.main_group.find_subpath(EXT_NAME, true)
group.set_source_tree('SOURCE_ROOT')
swift = group.new_reference("#{EXT_NAME}/ShareViewController.swift")
group.new_reference("#{EXT_NAME}/Info.plist")
ext.add_file_references([swift])

# Build settings on every configuration.
ext.build_configurations.each do |c|
  bs = c.build_settings
  bs['PRODUCT_BUNDLE_IDENTIFIER'] = EXT_BUNDLE_ID
  bs['INFOPLIST_FILE'] = "#{EXT_NAME}/Info.plist"
  bs['IPHONEOS_DEPLOYMENT_TARGET'] = deployment
  bs['SWIFT_VERSION'] = '5.0'
  bs['GENERATE_INFOPLIST_FILE'] = 'NO'
  bs['PRODUCT_NAME'] = '$(TARGET_NAME)'
  bs['SKIP_INSTALL'] = 'YES'
  bs['CODE_SIGN_STYLE'] = 'Automatic'
  bs['DEVELOPMENT_TEAM'] = team if team
  bs['TARGETED_DEVICE_FAMILY'] = '1,2'
end

# The app depends on and embeds the extension (Copy Files → PlugIns).
app.add_dependency(ext)
embed = app.new_copy_files_build_phase('Embed App Extensions')
embed.symbol_dst_subfolder_spec = :plug_ins
build_file = embed.add_file_reference(ext.product_reference)
build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

proj.save
puts "Added #{EXT_NAME} (#{EXT_BUNDLE_ID}), deployment #{deployment}. Targets: #{proj.targets.map(&:name).join(', ')}"
