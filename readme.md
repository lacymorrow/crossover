<p align="center">
  <img width="200" height="200" src="https://github.com/lacymorrow/crossover/raw/master/src/static/Icon.png">
</p>

# CrossOver [![TravisCI Status](https://travis-ci.org/lacymorrow/crossover.svg?branch=master)](https://travis-ci.org/lacymorrow/crossover) [![Appveyor Status](https://ci.appveyor.com/api/projects/status/qtxvaliwymvhxiwx/branch/master?svg=true)](https://ci.appveyor.com/project/lacymorrow/crossover)


> 🎯 Adjustable gaming Crosshair Overlay for any screen

CrossOver allows you to place a customizable crosshair overlay above any application window.
Improve your aim and gain a competitive advantage with a permanant colored crosshair to mark center screen.

### [Download CrossOver](https://github.com/lacymorrow/crossover/releases)


## Features

- Choose from tons of true-to-life sights
- Cross-platform: Windows, MacOS, and Linux support
- Support for multiple monitors
- Choose between center **Dot** or **Crosshair**
- Customize crosshair size, color, and opacity
- Persistant settings remembers your choices automatically
- Automatically updates in the background to keep your features fresh
- Tested via Spectron

<p align="center" style="background:#282a36;box-shadow: 3px 3px 15px 2px rgba(40,42,54,1);">
  <img width="504" height="288" src="https://github.com/lacymorrow/crossover/raw/master/src/static/demo.png">
</p>

Other crosshair programs offer a single style or color option, and often don't allow you to reposition them. CrossOver is a small, unintrusive crosshair overlay which has plenty of configuration options to assist with aiming and vision of your crosshair. CrossOver offers a huge improvement to many games' default crosshairs for those with colorblindness or contrast issues.

###### _Thanks to Reddit user /u/IrisFlame for the premade library of crosshairs!_

---

## Install

*macOS 10.10+, Linux, and Windows 7+ are supported.*

#### Download the latest version of CrossOver from the [releases page](https://github.com/lacymorrow/crossover/releases/latest)

**Windows**

[**Download**](https://github.com/user/repo/releases/latest/CrossOver-Setup-0.2.17.exe
) the `.exe` file. _**(CrossOver-Setup-x.x.x.exe)**_

**macOS**

[**Download**](https://github.com/user/repo/releases/latest/CrossOver-0.2.17.dmg
) the `.dmg` file. _**(CrossOver-x.x.x.dmg)**_

**Linux**

[**Download**](https://github.com/user/repo/releases/latest) the `.AppImage` or `.deb` file.

*The AppImage needs to be [made executable](http://discourse.appimage.org/t/how-to-make-an-appimage-executable/80) after download.*


##### _Because this app is Free and Open-Source, we cannot afford to sign our code. This means Chrome may warn about an untrusted download, this is normal. Click the arrow icon -> `Keep` to finish downloading. Windows Defender and Mac Gatekeeper will prevent you from running the app the first time._

###### Windows

> Windows protected your PC.

- Click `More Info`
- Click `Run Anyway`

###### Mac

> "CrossOver" cannot be opened because the developer cannot be verified.

- Locate the `CrossOver` app
- Hold Control while you click the app icon, then choose Open from the shortcut menu

###### _Further instructions for [Windows](https://www.techjunkie.com/windows-protected-your-pc-disable-smartscreen/) and [Mac](https://support.apple.com/en-us/HT202491)_

---

## Usage

> ❌ marks the spot...

Click and drag the crosshair to anywhere on any screen.

Double-click the drag icon to center the crosshair on the current display.

To quit in Windows, toggle the app unlocked and right-click > `Close`.

#### Keyboard Shortcuts

Description            | Keys
-----------------------| -----------------------
Toggle the settings window and lock the crosshair in place | <kbd>Control</kbd>-<kbd>Alt</kbd>-<kbd>Shift</kbd>-<kbd>X</kbd>
Quickly hide/show the application                          | <kbd>Control</kbd>-<kbd>Alt</kbd>-<kbd>Shift</kbd>-<kbd>E</kbd>
Reset all settings and center the window                   | <kbd>Control</kbd>-<kbd>Alt</kbd>-<kbd>Shift</kbd>-<kbd>R</kbd>
Display the "About" window details                        | <kbd>Control</kbd>-<kbd>Alt</kbd>-<kbd>Shift</kbd>-<kbd>A</kbd>
Move the crosshair a single pixel                          | <kbd>Control</kbd>-<kbd>Alt</kbd>-<kbd>Shift</kbd>-<kbd>Arrows</kbd>

###### <kbd>Option</kbd> is <kbd>Alt</kbd> on a Mac

<p align="center">
	<br />
	<img width="120" height="120" src="https://github.com/lacymorrow/crossover/raw/master/src/static/crosshairs/ballistic-firedot.png">
	<img width="120" height="120" src="https://github.com/lacymorrow/crossover/raw/master/src/static/crosshairs/moa-delta.png">
	<img width="120" height="120" src="https://github.com/lacymorrow/crossover/raw/master/src/static/crosshairs/blackout.png">
	<img width="120" height="120" src="https://github.com/lacymorrow/crossover/raw/master/src/static/crosshairs/leica-magnus.png">
	<img width="120" height="120" src="https://github.com/lacymorrow/crossover/raw/master/src/static/crosshairs/bull-ring-post.png">
</p>

---


## Development

Built with [Electron](https://electronjs.org). Simple HTML and Javascript, no framework.

Start developing in `src/main.js` and `src/renderer.js`.

### Run

```
$ npm install && npm start
```

### Build

_wine_ and _mono_ must be installed for Windows builds (_macOS_)

```
$ npm run build
```


### Publish

```
$ npm run release
```

Then edit the automatically created GitHub Releases draft and publish.


## Bugs

#### Hidden by fullscreen apps

Currently CrossOver only works with windowed applications, use `Windowed Fullscreen` mode if your game or application supports it. _Windows_ - [https://github.com/lacymorrow/crossover/issues/1]

#### Transparency not working

CrossOver will not hide settings when locked. Crosshair loses opacity (becomes opaque). _Linux (debian)_ - [https://github.com/lacymorrow/crossover/issues/5]

