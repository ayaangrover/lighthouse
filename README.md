# lighthouse

Sends a notification to your phone when a grade gets posted on schoology.

It runs locally on your laptop, checks your grades every 5 min, and pings your phone through ntfy.sh when something changes. Your schoology credentials **always** stay on your computer.

### Harker students only currently! feel free to fork + adapt for another school if you want

## What you need

- chrome (even if it isn't your main browser)
- node 18 or newer (https://nodejs.org)  (if you don't have this, theres a guide to get this at the bottom)
- the ntfy.sh app on your phone *or* the ntfy website on your phone or laptop

## Setup

Download the repo as a zip (press the big green Code button and press "Download ZIP") and unzip(double click) it somewhere that isn't downloads. Documents works fine, but ensure you don't delete it accidentally or move it atfer it's running.

Then open terminal, type `cd ` (with a space after it), drag the `dist/backend` folder from the unzipped folder into the terminal window, and press Enter. That opens the folder. Then run this (installs the packages needed to run it, and then starts the setup process):

```
npm install
npm run setup
```

The setup process gives you a "topic" name. This topic name is what ntfy uses to identify where to send the notifications. Open ntfy, hit +, paste it in, and leave the server as ntfy.sh. 

Once you've subscribed, go back to terminal and press Enter. This will send a test notification, so check that it shows up on ntfy, then type `y`. If it doesn't show up, the topic probably doesn't match exactly so run `npm run setup` again.

> [!CAUTION]
> Dont share the topic, as anyone who has it can see your grades! (unless you want to share your grades with them of course)

Then add the chrome extension:

1. Go to chrome://extensions
2. Turn on developer mode
3. Click load unpacked and pick the `dist/extension` folder

Then start it:

```
npm start
```

Open schoology in chrome and log in/reload. The first check just saves your current grades so you dont get spammed, after that you get notified for anything new.

## Keeping it running (on MacOS)

If you dont want to leave terminal open, press Ctrl+C to stop it first, then run:

```
bash ../install/install-macos.sh
```

Then it'll start on its own when you log into your computer and you won't have to worry about keeping it on.


This project is not affiliated with Harker or Schoology. Any use of this project in manners that may violate state or federal laws or the school handbook is not in any way condoned, and the maintainers of this project hold no responsability for any consequences that may arise from using (or not using) this project, which is merely a PoC.


### Here's how to install Node

Download the **LTS** version from [nodejs.org](https://nodejs.org) and run the installer. 

^^^ It is very important that you download the LTS version!

To check, open Terminal (on Mac) or Command Prompt (on Windows) and run:

```
node --version
```

Anything `v18` or higher is fine.