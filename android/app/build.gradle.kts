plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.luachill.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.luachill.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 3
        versionName = "2.2.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

/* Tự động đồng bộ mã nguồn web Lừa Chill vào assets/www trước mỗi lần build (Android Studio & GitHub Actions) */
val webRootDir = rootProject.file("..")
val syncWebAssets by tasks.registering(Sync::class) {
    onlyIf { webRootDir.resolve("index.html").exists() }
    from(webRootDir) {
        include("index.html", "config.js", "pwa.webmanifest", "sw.js")
        include("assets/**")
        include("core/**")
        include("module-suc-khoe/**")
        include("module-tycoon-tamly/**")
    }
    into(layout.projectDirectory.dir("src/main/assets/www"))
}

tasks.matching { it.name == "preBuild" }.configureEach {
    dependsOn(syncWebAssets)
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.11.0")
    implementation("androidx.browser:browser:1.8.0")
}
