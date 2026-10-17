<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    /**
     * Searchable and filterable list of client records with enquiry and project counts.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Client::withCount(['projects', 'enquiries']);

        // Search across name, email, phone, company, notes
        if ($request->filled('q') || $request->filled('search')) {
            $search = '%' . trim($request->input('q') ?: $request->input('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', $search)
                  ->orWhere('email', 'like', $search)
                  ->orWhere('phone', 'like', $search)
                  ->orWhere('company', 'like', $search)
                  ->orWhere('notes', 'like', $search);
            });
        }

        // Filter by status
        if ($request->filled('status') && strtoupper($request->input('status')) !== 'ALL') {
            $query->where('status', strtoupper($request->input('status')));
        }

        $clients = $query->orderBy('name')->get();

        $data = $clients->map(function (Client $c) {
            return [
                'id' => $c->id,
                'name' => $c->name,
                'email' => $c->email,
                'phone' => $c->phone,
                'company' => $c->company,
                'notes' => $c->notes,
                'status' => $c->status,
                'projects_count' => $c->projects_count,
                'enquiries_count' => $c->enquiries_count,
                'created_at' => $c->created_at?->toIso8601String(),
                'updated_at' => $c->updated_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'total' => $data->count(),
            'clients' => $data,
        ]);
    }

    /**
     * Create a new client record.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:100',
            'company' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'status' => 'nullable|in:ACTIVE,INACTIVE,ARCHIVED',
        ]);

        $validated['status'] = $validated['status'] ?? 'ACTIVE';
        $client = Client::create($validated);

        return response()->json([
            'message' => "Client '{$client->name}' created successfully.",
            'client' => $client,
        ], 201);
    }

    /**
     * View detailed client profile with related projects and enquiries.
     */
    public function show(int $id): JsonResponse
    {
        $client = Client::with([
            'projects' => function ($q) {
                $q->select('id', 'client_id', 'title', 'slug', 'category', 'location', 'publishing_status', 'is_published', 'created_at')
                  ->orderByDesc('id');
            },
            'enquiries' => function ($q) {
                $q->select('id', 'client_id', 'reference_number', 'project_type', 'status', 'location', 'created_at')
                  ->orderByDesc('id');
            },
        ])->findOrFail($id);

        return response()->json([
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'email' => $client->email,
                'phone' => $client->phone,
                'company' => $client->company,
                'notes' => $client->notes,
                'status' => $client->status,
                'projects' => $client->projects,
                'enquiries' => $client->enquiries,
                'created_at' => $client->created_at?->toIso8601String(),
                'updated_at' => $client->updated_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Update client details and notes.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $client = Client::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:100',
            'company' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'status' => 'nullable|in:ACTIVE,INACTIVE,ARCHIVED',
        ]);

        $client->update($validated);

        return response()->json([
            'message' => "Client '{$client->name}' updated successfully.",
            'client' => $client,
        ]);
    }

    /**
     * Safe client deletion: projects and enquiries are preserved via nullOnDelete foreign keys.
     */
    public function destroy(int $id): JsonResponse
    {
        $client = Client::findOrFail($id);
        $name = $client->name;

        $client->delete();

        return response()->json([
            'message' => "Client '{$name}' deleted. Associated projects and enquiries remain preserved.",
        ]);
    }
}
