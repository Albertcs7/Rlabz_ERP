<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$versions = DB::table('design_versions')->select('id', 'ticket_id', 'version_number', 'file_url', 'file_type')->get();
echo json_encode($versions, JSON_PRETTY_PRINT);
