# Interactive Missions Displays
- Goal: Allow church members at Iglesia Bautista Libertad to learn more about the missionaries the church supports through a visual interactive user experience.

## Phase 0: Planning (Proof of Concept)
### Platform
- PowerPoint was the best approach at the time as it appeared to be the easiest to implement as well as the easiest to update (or so we thought) given that PowerPoint will sync nicely to the OneDrive which our mini PC's should connect to.

### Hardware
- Attached is *most* the hardware that was purchased:
     - 2 Mini PC's (AMD CPUs, 16GB of RAM, other specs I can't fully remember)
     - 2 SMART Boards (repurposed)
     - 2 LED Light Strips
     - 4 KASA Smart Plugs
     - 2 600 lb rated TV wall mounts

## Phase 1: First Product (PowerPoint)
- The PowerPoint project can be accessed through this [link] (https://iblibertad.sharepoint.com/:p:/s/IBLMediaContent/EQlWjgaeKe1OqhZlpR6YQ3oBrpYATDbiFQZpPVzEXDTaBQ?e=mtVs8d). 
- This is the **current** product that was launched to the church to use. However, there could still be significant improvement in the automation of updating a missionary and since the file is now over a GB, it takes a while for onedrive to load in the new file after a change has been made. Sometimes when a change is made, someone has to manually turn it on and close the existing PowerPoint instance so that it can 

### Hardware & Windows Implementation
- For each SMART Board, we use a KASA Smart Plug that allows us to schedule when it should turn on. These should turn on a couple of minutes after the Mini PC's have turned on in order for users to not see the Windows startup screens. 
- For each Mini PC we use a KASA Smart Plug that allows us to schedule when it should turn on.
- Windows was configured to auto log in on startup
- Task Scheduler was used for running the startup and shutdown sequences. Startup is essentially opening the presentation powerpoint file. Shutdown does what it says, it shutsdown the PC. Power to the MiniPCs is turned off a couple of minutes after the shutdown sequence should have ended. This shut down sequence was done in order to protect the hardware so that it turns off properly.

## Phase 2: Improved Product (React Website)
- Below will outline the plans and goals for the improvement of this product through the conversion of the powerpoint to a React website. A React website has great potential to automate the creation of a missionary page through the power of a database or some cloud services like AWS or Google Cloud.

### Goal 1: New Proof of Concept
- Currently the Proof of Concept is still a work in progress and pretty limited. 
- Attached is the link of this website. Any time there is a push to master, this link should be updated: https://master.d1vy4te7fv937a.amplifyapp.com/ Please note there may still be a bug that I have not fixed yet where the starting video does not appear. For now just click on the white space and it should take you to the rest of the website. Again, still a WIP, but details like these should be ironed out soon!
- Estimated Time of Completion: December 31st, 2025

### Goal 2: Automation
- Automate the creation of a new missionary. Have an Admin page that can create and modify missionaries of the church. 
- Estimated Time of Completion: May 18th, 2026

### Goal 3: Continuous Updates
- Refining the UI, bug fixes, and code clean up.
- Estimated Time of Completion: August 10, 2026

### Goal 4: Improve Visuals/ User Experience
- Get a small sample of people to try out this new website and gather their feedback.
- Estimated Time of Completion: August 20th, 2026

### Goal 5: Debugg
- Add unit tests to backend.
- Stretch goal: add units to frontend.
- Estiamted Time of Completion: TBD

### Goal 6: Soft Launch
- Change one missions display board to have this react website shown to users and gather user feedback.
- Estimated Time of Soft Launch: TBD.

## Phase 3: New Launch
- Once this new website has been tested and we can guarantee that missionaries can get updated automatically, then this new product will be launched with a key emphasis placed on ensuring the user experience is of the highest quality. (surveys will be necessary for this in order to attain a quantitative measure).

## Phase 4: Updates and Expansion
- Assuming all goes well, other church's can benefit from a website like this. We shall see how that goes though!