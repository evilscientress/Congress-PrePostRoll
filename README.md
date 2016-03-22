A basic Template Engine for Adobe After Effects, that batch renders Pre/Post rolls based on a frab schedule.xml


## Usage
Currently there is no GUI, but there will be one available later on.

* You can use any of the following event properties: "title", "subtitle", "persons", "id", "position", "license", "abstract", "description", "slug"
* Just create a text layer, enter some dummy text, **RENAME** the layer the property prefixed with a '$' sign, for example $title
* If you want to animate the position of the text parent it to a null-layer.
* Run the script from After Effects (File->Scripts->Run Script file)
* Point it to the location of the frab schedule.xml file
* Specify an output directory for the rendered files
* After Effects may appear to have crashed but it's working. Just check the output dir.
* Exiting video files will be skipped. So to change only one video, just delete the video in question and point the script to the same output directory as before.

Alternatively the script tries to read the `SCHEDULEXML` and `OUTPUTDIR` enviorment variables instead of asking for user input. This can be used to start a render job from the command line. (currently not working correctly)

```
SET SCHEDULEXML="path to schedule.xml"
SET OUTPUTDIR="path to output directory"
"C:\Program Files\Adobe\Adobe After Effects CC 2015\Support Files\AfterFX.exe" -re -r "path to RenderPrePosRoll.jsx" "path to after effects project file"
```

## Settings
There are currently some hardcoded settings in the script, wich will be replaced by GUI elements. Just open the script and look at the variables at the top.

* *maxlength* is object where you specify the maximum number characters in on line 
* *posShift* is a object where you specify witch layers should be moved if a parameter exeeds one line
* *onlyone* if set to true the script stops after one video has been rendered
* *outTmplt* the name of the Output-Module Template to use.
* *videoSuffix* this string is appended to the frab-talk-id to create the video filenames. The correct file extensions for the Output-Module Template must be added here