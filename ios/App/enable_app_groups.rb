#!/usr/bin/env ruby
# Enables the App Groups capability (group.com.forkmap.app) on BOTH targets
# (App + ShareExtension) — the shared container is the only channel between the
# app and the Share Extension (separate processes).
# Idempotent. Run from ios/App: `ruby enable_app_groups.rb`
require 'xcodeproj'

PROJECT = 'App.xcodeproj'
GROUP_ID = 'group.com.forkmap.app'
ENTITLEMENTS = {
  'App' => 'App/App.entitlements',
  'ShareExtension' => 'ShareExtension/ShareExtension.entitlements'
}

proj = Xcodeproj::Project.open(PROJECT)

ENTITLEMENTS.each do |target_name, path|
  target = proj.targets.find { |t| t.name == target_name } or abort "#{target_name} target not found"

  # Point every build configuration at the target's .entitlements file.
  target.build_configurations.each do |c|
    c.build_settings['CODE_SIGN_ENTITLEMENTS'] = path
  end

  # Add the file reference to the project tree (so it shows up in Xcode).
  group = target_name == 'App' ? proj.main_group.find_subpath('App', true) : proj.main_group.find_subpath('ShareExtension', true)
  unless group.files.any? { |f| f.path == File.basename(path) || f.path == path }
    group.new_reference(path)
  end

  # Flip the capability on in the target attributes so Xcode's UI shows it.
  attrs = proj.root_object.attributes['TargetAttributes'] ||= {}
  tattrs = attrs[target.uuid] ||= {}
  caps = tattrs['SystemCapabilities'] ||= {}
  caps['com.apple.ApplicationGroups.iOS'] = { 'enabled' => 1 }
end

proj.save
puts "App Groups (#{GROUP_ID}) enabled on: #{ENTITLEMENTS.keys.join(', ')}"
puts 'Xcode still has to register the group with your team on first signed build.'
