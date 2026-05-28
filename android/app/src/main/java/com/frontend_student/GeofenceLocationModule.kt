package com.frontend_student

import android.Manifest
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.location.LocationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource

class GeofenceLocationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "GeofenceLocation"

    @ReactMethod
    fun getCurrentLocation(promise: Promise) {
        val hasFineLocation = ActivityCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val hasCoarseLocation = ActivityCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasFineLocation && !hasCoarseLocation) {
            promise.reject("LOCATION_PERMISSION_DENIED", "Location permission is required")
            return
        }

        val client = LocationServices.getFusedLocationProviderClient(reactContext)
        val cancellationTokenSource = CancellationTokenSource()
        client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancellationTokenSource.token)
            .addOnSuccessListener { location ->
                if (location == null) {
                    promise.reject("LOCATION_UNAVAILABLE", "Current location is unavailable")
                    return@addOnSuccessListener
                }

                val result = Arguments.createMap()
                result.putDouble("latitude", location.latitude)
                result.putDouble("longitude", location.longitude)
                result.putDouble("accuracyMeters", location.accuracy.toDouble())
                result.putBoolean("isMockLocation", isMockLocation(location))
                promise.resolve(result)
            }
            .addOnFailureListener { error ->
                promise.reject("LOCATION_ERROR", error.message, error)
            }
    }

    private fun isMockLocation(location: Location): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            location.isMock
        } else {
            LocationCompat.isMock(location)
        }
    }
}
