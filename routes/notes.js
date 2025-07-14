const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const fetchuser = require("../middleware/fetchuser");
const { body, validationResult } = require("express-validator");

// GET: /api/notes/fetchallnotes
router.get("/fetchallnotes", fetchuser, async (req, res) => {
  try {
    // Check if supabase is available
    if (!supabase) {
      return res.status(503).json({ message: "Database service unavailable" });
    }

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user", req.user.id);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST: /api/notes/addnote
router.post(
  "/addnote",
  fetchuser,
  [
    body("title").isLength({ min: 1 }),
    body("description").isLength({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if supabase is available
    if (!supabase) {
      return res.status(503).json({ message: "Database service unavailable" });
    }

    try {
      const { title, description, tag } = req.body;

      const { data, error } = await supabase.from("notes").insert([
        {
          user: req.user.id,
          title,
          description,
          tag,
        },
      ]).select().single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// PUT: /api/notes/updatenote/:id
router.put("/updatenote/:id", fetchuser, async (req, res) => {
  const { title, description, tag } = req.body;

  // Check if supabase is available
  if (!supabase) {
    return res.status(503).json({ message: "Database service unavailable" });
  }

  try {
    // 1. Fetch the note
    const { data: existingNote, error: fetchError } = await supabase
      .from("notes")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (fetchError || !existingNote) {
      return res.status(404).json({ errors: "Note not found" });
    }

    if (existingNote.user !== req.user.id) {
      return res.status(401).send("Not authorized");
    }

    // 2. Update the note
    const { data: updatedNote, error } = await supabase
      .from("notes")
      .update({
        title: title ?? existingNote.title,
        description: description ?? existingNote.description,
        tag: tag ?? existingNote.tag,
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(updatedNote);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE: /api/notes/deletenote/:id
router.delete("/deletenote/:id", fetchuser, async (req, res) => {
  // Check if supabase is available
  if (!supabase) {
    return res.status(503).json({ message: "Database service unavailable" });
  }

  try {
    const { data: note, error: fetchError } = await supabase
      .from("notes")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (fetchError || !note) {
      return res.status(404).json({ errors: "Note not found" });
    }

    if (note.user !== req.user.id) {
      return res.status(401).send("Not authorized to delete");
    }

    const { data: deletedNote, error } = await supabase
      .from("notes")
      .delete()
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: "Note has been deleted", note: deletedNote });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE: /api/notes/clearallnotes
router.delete("/clearallnotes", fetchuser, async (req, res) => {
  // Check if supabase is available
  if (!supabase) {
    return res.status(503).json({ message: "Database service unavailable" });
  }

  try {
    const { data: deletedNotes, error } = await supabase
      .from("notes")
      .delete()
      .eq("user", req.user.id)
      .select();

    if (error) throw error;
    res.json({ 
      success: "All notes have been deleted", 
      deletedCount: deletedNotes ? deletedNotes.length : 0 
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
