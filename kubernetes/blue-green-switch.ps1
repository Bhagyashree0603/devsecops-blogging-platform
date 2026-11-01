param([Parameter(Mandatory=$true)][ValidateSet('blue','green')][string]$Color)
# Apply after the target color deployment is healthy. The Service selects the chosen color.
kubectl patch service blogging-api -n blogging -p (ConvertTo-Json @{spec=@{selector=@{app='blogging-api'; color=$Color}}} -Compress)
kubectl get endpoints blogging-api -n blogging
