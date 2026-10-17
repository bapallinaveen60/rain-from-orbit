# Methods called from the page's JavaScript must keep their names.
-keepclassmembers class io.github.bapallinaveen60.rainfromorbit.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
