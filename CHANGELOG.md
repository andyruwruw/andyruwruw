# v1.2.0 - June 17, 2022

**Organization**

Condensed environmental variables into static class.
API related methods are now in one object.

**Mock Data**

Added the ability to use mock data instead of live data.

# v1.1.2 - January 21, 2022

**Organization and Linting**

Reorganized files.
Added documentation.
Added linting.
Added Github Workflow for CI.

**Default Art**

Art is now processed in the same function.
Blank image used if none available.

**Locked Endpoints**

Ensured `/api/auth` and `/api/login` are only available in `NODE_ENV=development`.

**Environment Variables**

Added Chess.com username as environmental variable.
Added environment as environmental variable.

**Prettier Login**

Login now sends back React component.

**Custom URL**

URL for API changed.

# v1.1.1 - April 28, 2021

**Added Skill**

Learned Terraform

**Skill Icon Paths now take Transform Property**

Helped with centering an icon.

# v1.1.0 - January 12, 2021

**Better Typescript definitions**

Just needed in general.

**Dynamic icons rather than separate components**

Adding a new icon was a pain, so Icons are now stored as an array of SVG paths, which are then turned into icons. This will clean up the repo a bit and make it easier to add more in the future. The skills endpoint accepts an array of icon names, and will display them in that order. You should be able to use the endpoint and remove things from the array as you wish.

**Last played song**

Instead of displaying "*Nothing Currently*" as a placeholder for when there is no current playback, the user's last played song will now be requested and the message changed from "*currently jamming out to*" to "*last jammed out to*". Keeping the component interesting even if I'm having a quiet moment.